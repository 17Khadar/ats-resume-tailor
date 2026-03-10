// ============================================================
// JD Parser — extracts structured fields from raw JD text
// ============================================================

import type { ParsedJD } from "@/types";

// ── Domain & Compliance keyword lists ───────────────────────

const DOMAIN_KEYWORDS = [
  "Healthcare", "Health Care", "Hospital", "Clinical",
  "Retail", "eCommerce", "E-Commerce",
  "Finance", "Financial", "Banking", "Insurance",
  "Government", "Federal", "Public Sector",
  "Logistics", "Supply Chain", "Warehouse", "Transportation",
  "Pharmaceutical", "Pharma", "Life Sciences",
  "Telecom", "Telecommunications",
  "Energy", "Oil & Gas", "Utilities",
  "Media", "Entertainment",
  "Manufacturing",
  "Education", "EdTech",
];

const COMPLIANCE_KEYWORDS = [
  "HIPAA", "PHI", "HL7", "FHIR",
  "PCI-DSS", "PCI DSS",
  "SOX",
  "SOC 2", "SOC2",
  "GDPR",
  "CCPA",
  "FedRAMP",
  "NIST",
  "ISO 27001",
  "HITRUST",
];

// ── Helpers ─────────────────────────────────────────────────

/** Case-insensitive keyword search in text */
function findMatches(text: string, keywords: string[]): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      // Use the canonical casing from the list
      if (!found.includes(kw)) found.push(kw);
    }
  }
  return found;
}

/**
 * Extract a section between a heading and the next heading.
 * Headings are lines that look like:  "Responsibilities:" or "MUST HAVE:" etc.
 */
function extractSection(text: string, headingPatterns: RegExp[]): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];
  let capturing = false;

  for (const line of lines) {
    // Check if this line is a heading
    const isHeading = headingPatterns.some((p) => p.test(line));

    if (isHeading) {
      if (capturing) break; // Found next section, stop
      capturing = true;
      // If the heading line also contains content after colon, grab it
      const afterColon = line.replace(/^[^:]+:\s*/, "").trim();
      if (afterColon && afterColon !== line) items.push(afterColon);
      continue;
    }

    if (capturing) {
      // Clean bullet prefixes
      const cleaned = line.replace(/^[-•*▪►◦]\s*/, "").trim();
      if (cleaned.length > 5) items.push(cleaned);
    }
  }

  return items;
}

/** Lines that are generic JD headings or intro phrases, NOT actual job titles */
const GENERIC_HEADING_RE = /^(full\s*job\s*description|job\s*description|about\s*(this|the)\s*(role|position|job|opportunity)|overview|description|summary|company\s*description|what\s*we('re| are)\s*looking\s*for|who\s*we\s*are|about\s*us|responsibilities|requirements|qualifications|benefits|perks|compensation|equal\s*opportunity|eoe|position\s*summary|role\s*summary|job\s*summary|posting\s*details|apply\s*now|this\s*(opportunity|role|position)\s*(will|is|offers)|in\s*this\s*role)\b/i;

/** Common tech role keywords that signal an actual job title */
const JOB_TITLE_SIGNAL_RE = /\b(engineer|developer|architect|analyst|administrator|consultant|manager|lead|specialist|scientist|devops|sre|dba|director|coordinator|technician|intern|associate|senior|junior|principal|staff|data|cloud|software|systems?|platform|infrastructure|security|network|ml|ai|machine learning|full[- ]?stack|front[- ]?end|back[- ]?end|mobile|ios|android|qa|quality|test|support|operations)\b/i;

/** Pull the job title from the JD text using multiple strategies */
function extractTitle(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Strategy 1: Explicit label — "Job Title: ...", "Position: ..."
  for (const line of lines.slice(0, 20)) {
    const labelMatch = line.match(/(?:job\s*title|position\s*title|title|position|role)\s*[:–\-]\s*(.+)/i);
    if (labelMatch) {
      const candidate = labelMatch[1].trim();
      if (!GENERIC_HEADING_RE.test(candidate) && candidate.length < 100) {
        return candidate;
      }
    }
  }

  // Strategy 2: First short line that looks like a real job title
  for (const line of lines.slice(0, 10)) {
    if (GENERIC_HEADING_RE.test(line)) continue;
    if (line.length > 5 && line.length < 80 && !line.toLowerCase().startsWith("http") && JOB_TITLE_SIGNAL_RE.test(line)) {
      return line.replace(/[\-–|].*$/, "").trim() || line;
    }
  }

  // Strategy 3: Scan the first 25 lines for anything containing a known role keyword
  for (const line of lines.slice(0, 25)) {
    if (GENERIC_HEADING_RE.test(line)) continue;
    if (line.length >= 8 && line.length < 80 && JOB_TITLE_SIGNAL_RE.test(line)) {
      return line.replace(/[\-–|].*$/, "").trim() || line;
    }
  }

  // Strategy 4: Fallback — first non-generic short line
  for (const line of lines.slice(0, 10)) {
    if (GENERIC_HEADING_RE.test(line)) continue;
    if (line.length > 5 && line.length < 120 && !line.toLowerCase().startsWith("http")) {
      return line;
    }
  }

  return "Unknown Title";
}

/** Extract location from common patterns */
function extractLocation(text: string): string {
  // Try patterns like "Location: Dallas, TX" or "Location : Remote"
  const locMatch = text.match(/(?:location|work\s*location|job\s*location)\s*[:–-]\s*([^\n]+)/i);
  if (locMatch) return locMatch[1].trim().replace(/\s+/g, " ");

  // Look for city, state patterns in the first 20 lines
  const lines = text.split("\n").slice(0, 20);
  for (const line of lines) {
    const cityState = line.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})\b/);
    if (cityState) return cityState[1].trim();
    // Remote patterns
    if (/\b(remote|hybrid|on-?site)\b/i.test(line) && line.length < 80) {
      return line.trim();
    }
  }

  return "Not specified";
}

/** Find repeated meaningful phrases (2+ word combos appearing 2+ times) */
function findRepeatedPhrases(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  const bigramCounts: Record<string, number> = {};

  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    bigramCounts[bigram] = (bigramCounts[bigram] || 0) + 1;
  }

  // Common filler words to exclude
  const stopBigrams = new Set(["with the", "in the", "and the", "to the", "of the", "for the", "such as", "this role", "will be", "able to"]);

  return Object.entries(bigramCounts)
    .filter(([bg, count]) => count >= 2 && !stopBigrams.has(bg))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([bg]) => bg);
}

// ── Main parser ─────────────────────────────────────────────

/**
 * Parse raw JD text into a structured ParsedJD object.
 * Uses heuristic pattern matching — no AI required.
 */
export function parseJD(rawText: string): ParsedJD {
  const title = extractTitle(rawText);
  const location = extractLocation(rawText);

  const rawMustHaves = extractSection(rawText, [
    /must\s*-?\s*have/i,
    /required\s*(qualifications?|skills?|experience)/i,
    /minimum\s*(qualifications?|requirements?)/i,
    /basic\s*qualifications?/i,
    /requirements?\s*:/i,
  ]);
  const mustHaves = filterQualificationNoise(rawMustHaves);

  const rawPreferred = extractSection(rawText, [
    /preferred\s*(qualifications?|skills?|experience)/i,
    /nice\s*to\s*have/i,
    /desired\s*(qualifications?|skills?)/i,
    /bonus\s*(qualifications?|skills?)/i,
    /additional\s*qualifications?/i,
  ]);
  const preferred = filterQualificationNoise(rawPreferred);

  const responsibilities = extractSection(rawText, [
    /responsibilities?\s*[:]/i,
    /what\s*you('ll| will)\s*do/i,
    /key\s*responsibilities/i,
    /duties\s*[:]/i,
    /role\s*description/i,
    /job\s*description\s*[:]/i,
    /about\s*the\s*role/i,
  ]);

  const domainKeywords = findMatches(rawText, DOMAIN_KEYWORDS);
  const complianceKeywords = findMatches(rawText, COMPLIANCE_KEYWORDS);
  const repeatedPhrases = findRepeatedPhrases(rawText);

  // ── Fallback: if section-based extraction found nothing, mine the full text ──
  const finalMustHaves = mustHaves.length > 0 ? mustHaves : extractSkillsFromFullText(rawText);
  const finalPreferred = preferred.length > 0 ? preferred : [];
  const finalResponsibilities = responsibilities.length > 0 ? responsibilities : extractResponsibilitiesFromFullText(rawText);

  return {
    title,
    location,
    mustHaves: finalMustHaves,
    preferred: finalPreferred,
    responsibilities: finalResponsibilities,
    domainKeywords,
    complianceKeywords,
    repeatedPhrases,
    rawText,
  };
}

// ── Qualification / education noise filter ──────────────────

/**
 * Filter out lines that are degree requirements, years-of-experience prose,
 * or other non-skill qualification text that should never become resume bullets.
 */
function filterQualificationNoise(items: string[]): string[] {
  return items.filter((item) => {
    const lower = item.toLowerCase();
    // Reject degree/education requirement sentences
    if (/\b(bachelor'?s?|master'?s?|phd|doctorate|degree|diploma)\b.*\b(science|engineering|computer|math|related field)\b/i.test(item)) return false;
    // Reject "OR equivalent experience" style lines
    if (/^or\s+(equivalent|bachelor|master)/i.test(item.trim())) return false;
    // Reject lines that are mostly about years + degree requirements (long prose)
    if (item.length > 120 && /\b(degree|bachelor|master|year\(?s?\)?.*experience)\b/i.test(item)) return false;
    // Reject "Preferred qualification:" labels with no content
    if (/^preferred\s*qualification\s*:?\s*$/i.test(item.trim())) return false;
    // Reject lines that are just section sub-headers
    if (/^(required|preferred|minimum|basic)\s*(qualifications?|skills?)\s*:?\s*$/i.test(item.trim())) return false;
    // Keep items that contain at least one tech keyword or are short enough to be skill names
    if (item.length < 60) return true;
    // For longer items, require at least one tech-related word
    return TECH_SKILLS.some((skill) => lower.includes(skill.toLowerCase()));
  });
}

// ── Full-text fallback extractors ───────────────────────────

/** Well-known tech skills / tools to scan for when no section headings are found */
const TECH_SKILLS = [
  "Python", "Java", "Scala", "SQL", "PySpark", "Spark", "Hadoop", "Hive",
  "Kafka", "Airflow", "Docker", "Kubernetes", "Terraform", "Jenkins",
  "AWS", "Azure", "GCP", "S3", "EC2", "Lambda", "Glue", "Redshift", "Athena",
  "Kinesis", "CloudWatch", "CloudFormation", "SageMaker", "EMR", "DynamoDB",
  "RDS", "IAM", "VPC", "Step Functions", "SNS", "SQS", "ECS", "EKS", "Fargate",
  "ADLS", "Synapse", "Data Factory", "ADF", "Databricks", "Event Hubs",
  "Key Vault", "Cosmos DB", "Azure SQL", "Logic Apps", "Azure Functions",
  "Power BI", "Tableau", "Snowflake", "dbt", "NiFi", "Flink",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
  "Git", "GitHub", "GitLab", "Bitbucket", "JIRA", "Confluence",
  "ETL", "ELT", "CI/CD", "REST", "API", "JSON", "Parquet", "Avro", "Delta Lake",
  "Iceberg", "machine learning", "data pipeline", "data lake", "data warehouse",
  "microservices", "serverless", "real-time", "batch processing",
  "HIPAA", "SOX", "PCI", "GDPR", "Agile", "Scrum",
  "Bash", "Shell", "PowerShell", "Go", "C++", "C#", ".NET",
  "Looker", "Grafana", "Presto", "BigQuery",
];

/** Extract skill keywords from the full JD text when section parsing fails */
function extractSkillsFromFullText(text: string): string[] {
  const lower = text.toLowerCase();
  return TECH_SKILLS.filter((skill) => lower.includes(skill.toLowerCase()));
}

/** Extract responsibility-like sentences from the full JD text */
function extractResponsibilitiesFromFullText(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: string[] = [];

  for (const line of lines) {
    const cleaned = line.replace(/^[-•*▪►◦]\s*/, "").trim();
    // Lines that start with action verbs or describe duties
    if (
      cleaned.length > 20 && cleaned.length < 300 &&
      /^(design|develop|build|implement|architect|deploy|manage|lead|optim|automat|configur|integrat|migrat|orchestrat|monitor|maintain|creat|establish|streamlin|enhanc|engineer|collaborat|analyz|transform|execut|deliver|facilitat|administr|provision|troubleshoot|resolv|coordinat|operat|support|secur|test|validat|document|evaluat|work\s*(with|closely)|partner)/i.test(cleaned)
    ) {
      results.push(cleaned);
    }
  }

  // Also capture bullet-style lines (they often describe responsibilities)
  if (results.length < 3) {
    for (const line of lines) {
      if (/^[-•*▪►◦]/.test(line) && line.length > 20 && line.length < 300) {
        const cleaned = line.replace(/^[-•*▪►◦]\s*/, "").trim();
        if (!results.includes(cleaned)) results.push(cleaned);
      }
    }
  }

  return results.slice(0, 15);
}
