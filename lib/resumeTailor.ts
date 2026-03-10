// ============================================================
// Resume Tailor — aggressive JD-aligned resume tailoring
// ============================================================
// Rewrites bullets using JD action verbs, injects missing skills
// into both the Skills section AND relevant experience bullets,
// and generates new experience points where gaps exist.

import type {
  ATSRubricBreakdown,
  CloudDetectionResult,
  ExtractedMasterResume,
  ParsedJD,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeSectionOutput,
} from "@/types";

// ── Helpers ─────────────────────────────────────────────────

function has(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function uniqueCI(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Action verb extraction from JD ──────────────────────────

const COMMON_ACTION_VERBS = [
  "designed", "developed", "built", "implemented", "architected",
  "deployed", "managed", "led", "optimized", "automated",
  "configured", "integrated", "migrated", "orchestrated", "monitored",
  "maintained", "created", "established", "streamlined", "enhanced",
  "engineered", "spearheaded", "collaborated", "analyzed", "transformed",
  "executed", "delivered", "facilitated", "administered", "provisioned",
  "troubleshot", "resolved", "coordinated", "operated", "supported",
  "secured", "tested", "validated", "documented", "evaluated",
  "standardized", "consolidated", "aggregated", "ingested", "processed",
  "scheduled", "modeled", "governed", "defined", "drove",
];

/**
 * Extract action verbs that actually appear in JD responsibilities.
 * Falls back to common verbs if none are detected.
 */
function extractJdVerbs(jd: ParsedJD): string[] {
  const allJdText = [...jd.responsibilities, ...jd.mustHaves].join(" ").toLowerCase();
  const found = COMMON_ACTION_VERBS.filter((v) => allJdText.includes(v));

  // Also grab verbs appearing at the start of JD responsibility lines
  for (const resp of jd.responsibilities) {
    const firstWord = resp.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
    if (firstWord && firstWord.length > 3 && firstWord.endsWith("ed") || firstWord?.endsWith("ing")) {
      if (!found.includes(firstWord)) found.push(firstWord);
    }
  }

  return found.length > 0 ? found : ["developed", "implemented", "designed", "managed", "optimized"];
}

/**
 * Extract key tools/technologies mentioned in the JD
 */
function extractJdTools(jd: ParsedJD): string[] {
  return sanitizeJdKeywords([...jd.mustHaves, ...jd.preferred]);
}

// ── Skills: inject JD skills directly ───────────────────────

/** Sentence/requirement patterns that should NOT be injected as skill keywords */
const NOT_A_SKILL_RE = /\b(year|degree|bachelor|master|phd|experience|qualification|preferred|equivalent|related field|must\s*have|ability to|familiarity|knowledge of|understanding of|including|proficiency|certification|certified)\b/i;

/** Returns true if the item looks like a short technology/tool name, not a requirement sentence */
function isSkillKeyword(item: string): boolean {
  if (item.length > 60) return false;
  if (NOT_A_SKILL_RE.test(item)) return false;
  return true;
}

/**
 * From a long requirement sentence, extract any recognizable tech tool names.
 */
const KNOWN_TOOLS = [
  "Python", "Java", "Scala", "SQL", "PySpark", "Spark", "Spark SQL", "Hadoop", "Hive",
  "Kafka", "Airflow", "Docker", "Kubernetes", "Terraform", "Jenkins", "Bicep",
  "AWS", "Azure", "GCP", "S3", "EC2", "Lambda", "Glue", "Redshift", "Athena",
  "Kinesis", "CloudWatch", "CloudFormation", "SageMaker", "EMR", "DynamoDB",
  "RDS", "IAM", "VPC", "Step Functions", "SNS", "SQS", "ECS", "EKS", "Fargate",
  "ADLS", "ADLS Gen2", "Synapse", "Azure Synapse Analytics", "Data Factory", "ADF",
  "Databricks", "Azure Databricks", "Event Hubs", "Azure Event Hubs",
  "Key Vault", "Azure Key Vault", "Cosmos DB", "Azure SQL", "Logic Apps", "Azure Functions",
  "Azure Monitor", "Log Analytics", "Azure Data Explorer", "Azure DevOps", "Azure Storage",
  "Power BI", "Tableau", "Snowflake", "dbt", "NiFi", "Flink",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
  "Git", "GitHub", "GitLab", "Bitbucket", "JIRA", "Confluence",
  "ETL", "ELT", "CI/CD", "REST", "gRPC", "API", "JSON", "Parquet", "Avro", "Delta Lake", "Delta",
  "Iceberg", "Fabric", "Fabric DW", "Fabric Data Factory",
  "HIPAA", "SOX", "PCI", "GDPR", "RBAC", "Agile", "Scrum",
  "Bash", "Shell", "PowerShell", "Go", "C++", "C#", ".NET",
  "Looker", "Grafana", "Presto", "BigQuery",
  "Apache Spark", "Azure Data Lake",
];

function extractToolsFromSentence(sentence: string): string[] {
  const lower = sentence.toLowerCase();
  return KNOWN_TOOLS.filter((t) => lower.includes(t.toLowerCase()));
}

/** Sanitize JD keywords: keep short tool names as-is, extract tools from long sentences. */
function sanitizeJdKeywords(items: string[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (isSkillKeyword(item)) {
      result.push(item);
    } else {
      result.push(...extractToolsFromSentence(item));
    }
  }
  const seen = new Set<string>();
  return result.filter((r) => {
    const key = r.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSkillsSection(
  masterSkillsText: string,
  jd: ParsedJD,
  cloud: CloudDetectionResult
): { skills: string[]; skillsAdded: string[] } {
  const masterLines = masterSkillsText.split("\n").map((l) => l.trim()).filter(Boolean);
  const allJdKeywords = sanitizeJdKeywords([...jd.mustHaves, ...jd.preferred]);
  const masterLower = masterSkillsText.toLowerCase();

  // Find skills missing from master
  const missing = allJdKeywords.filter((kw) => !has(masterLower, kw));
  const skillsAdded: string[] = [];

  // Try to inject missing skills into EXISTING category lines
  const enhancedLines = masterLines.map((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) return line;

    const category = line.substring(0, colonIdx).toLowerCase();
    const afterColon = line.substring(colonIdx + 1).trim();

    const toInject: string[] = [];
    for (const kw of [...missing]) {
      if (skillFitsCategory(kw, category)) {
        toInject.push(kw);
        // Remove from missing so we don't double-add
        const idx = missing.indexOf(kw);
        if (idx > -1) missing.splice(idx, 1);
        skillsAdded.push(kw);
      }
    }

    if (toInject.length > 0) {
      return `${line.substring(0, colonIdx + 1)} ${afterColon}, ${toInject.join(", ")}`;
    }
    return line;
  });

  // Prioritize lines containing must-have keywords
  const prioritized: string[] = [];
  const rest: string[] = [];
  for (const line of enhancedLines) {
    if (jd.mustHaves.some((mh) => has(line, mh))) {
      prioritized.push(line);
    } else {
      rest.push(line);
    }
  }

  const skills = [...prioritized, ...rest];

  // Any remaining missing skills get added as a new line (directly, no hedging)
  if (missing.length > 0) {
    skills.push(`Additional Technologies: ${missing.join(", ")}`);
    skillsAdded.push(...missing);
  }

  return { skills, skillsAdded };
}

/** Heuristic: does a skill keyword fit a given skill category? */
function skillFitsCategory(skill: string, category: string): boolean {
  const s = skill.toLowerCase();
  const c = category.toLowerCase();

  const categoryMap: Record<string, string[]> = {
    "cloud": ["aws", "azure", "gcp", "s3", "ec2", "lambda", "glue", "redshift", "athena", "kinesis",
              "cloudwatch", "cloudformation", "sagemaker", "vpc", "iam", "rds", "adls", "synapse",
              "data factory", "adf", "databricks", "event hubs", "key vault", "cosmos", "fabric", "azure sql"],
    "data": ["sql", "python", "spark", "hadoop", "hive", "kafka", "airflow", "etl", "pipeline",
             "snowflake", "bigquery", "dbt", "nifi", "flink", "presto", "delta lake", "iceberg",
             "parquet", "avro", "json", "csv", "api", "rest", "jdbc", "odbc"],
    "programming": ["python", "java", "scala", "sql", "pyspark", "bash", "shell", "powershell", "r",
                     "javascript", "typescript", "go", "c++", "c#", ".net"],
    "devops": ["docker", "kubernetes", "jenkins", "terraform", "ci/cd", "git", "github", "gitlab",
               "ansible", "chef", "puppet", "helm", "argocd", "circleci"],
    "database": ["sql", "mysql", "postgresql", "oracle", "mongodb", "cassandra", "dynamodb",
                  "redis", "elasticsearch", "neo4j", "cosmos db", "azure sql", "rds", "redshift"],
    "visualization": ["tableau", "power bi", "quicksight", "looker", "grafana", "kibana", "superset"],
    "orchestration": ["airflow", "step functions", "data factory", "adf", "luigi", "dagster", "prefect", "oozie"],
    "streaming": ["kafka", "kinesis", "event hubs", "flink", "spark streaming", "storm", "pulsar"],
    "processing": ["spark", "pyspark", "emr", "glue", "databricks", "hive", "presto", "flink", "beam"],
    "tools": ["jira", "confluence", "servicenow", "slack", "teams", "bitbucket"],
    "compliance": ["hipaa", "phi", "pci", "sox", "soc", "gdpr", "ccpa", "fedramp", "nist", "hitrust"],
  };

  for (const [catKey, keywords] of Object.entries(categoryMap)) {
    if (c.includes(catKey) && keywords.some((kw) => s.includes(kw) || kw.includes(s))) {
      return true;
    }
  }

  // Also try fuzzy: if the category itself mentions similar words
  if (c.includes("service") && s.includes("service")) return true;
  if (c.includes("framework") && (s.includes("spark") || s.includes("hadoop"))) return true;

  return false;
}

// ── Summary: rewrite to mirror JD language ──────────────────

/** Check if a string looks like a valid job title (not raw JD text) */
function isValidTitle(title: string): boolean {
  if (title.length > 80) return false;
  if (/\b(bachelor|master|degree|qualification|experience.*year|year.*experience)\b/i.test(title)) return false;
  if (/^(required|preferred|minimum|basic)\s/i.test(title)) return false;
  if (/^this\s*(opportunity|role|position)/i.test(title)) return false;
  if (/\b(allow you to|will\s+(let|enable|give)|you\s+will)\b/i.test(title)) return false;
  return true;
}

/** Filter must-haves to only real skill/tool names (not education/experience prose) */
function filterToRealSkills(items: string[]): string[] {
  return items.filter((item) => {
    if (item.length > 80) return false;
    if (/\b(bachelor|master|degree|diploma|phd|equivalent experience|related field)\b/i.test(item)) return false;
    return true;
  });
}

function buildSummary(masterSummary: string, jd: ParsedJD, cloud: CloudDetectionResult): string {
  // Use JD title only if it looks like a real job title
  const safeTitle = (jd.title && isValidTitle(jd.title)) ? jd.title : "Data Engineer";

  if (!masterSummary) {
    const topSkills = filterToRealSkills(jd.mustHaves).slice(0, 5).join(", ");
    return `Results-driven ${safeTitle} with extensive experience in ${cloud.cloudType.toUpperCase()} cloud technologies, ${topSkills}, and building scalable data pipelines. Proven track record of designing and implementing end-to-end data solutions that drive business insights and operational efficiency.`;
  }

  let summary = masterSummary.trim();
  const topJdSkills = filterToRealSkills(jd.mustHaves).slice(0, 6);

  // Replace the title reference if present
  if (!has(summary, safeTitle)) {
    // Rewrite the first sentence to include JD title
    const firstDot = summary.indexOf(".");
    if (firstDot > 0) {
      const rest = summary.substring(firstDot + 1).trim();
      summary = `Results-driven ${safeTitle} ${summary.substring(0, firstDot).replace(/^.*?(with|having|bringing)/i, "with").trim()}. ${rest}`;
    } else {
      summary = `Results-driven ${safeTitle} with ${summary}`;
    }
  }

  // Inject top JD must-have keywords that are missing from the summary
  const missingInSummary = topJdSkills.filter((kw) => !has(summary, kw));
  if (missingInSummary.length > 0) {
    summary += ` Skilled in ${missingInSummary.join(", ")}, with hands-on experience delivering production-grade solutions.`;
  }

  return summary;
}

// ── Experience: rewrite bullets + inject new ones ───────────

/**
 * Rewrite existing bullets to use JD action verbs and inject JD tool names
 * where they naturally fit the bullet context.
 */
function rewriteBullet(bullet: string, jdVerbs: string[], jdTools: string[], jd: ParsedJD): string {
  let rewritten = bullet;

  // 1. Replace the leading verb with a JD verb if possible
  const words = rewritten.split(/\s+/);
  const firstWord = words[0]?.toLowerCase().replace(/[^a-z]/g, "");
  if (firstWord && firstWord.length > 3) {
    // Find a JD verb that's semantically close
    const verbMapping: Record<string, string[]> = {
      "developed": ["built", "created", "wrote", "coded", "programmed"],
      "designed": ["planned", "outlined", "structured", "mapped"],
      "implemented": ["executed", "deployed", "rolled out", "set up", "introduced"],
      "architected": ["designed", "planned", "structured"],
      "automated": ["scripted", "streamlined", "mechanized"],
      "optimized": ["improved", "enhanced", "tuned", "boosted", "refined"],
      "managed": ["oversaw", "handled", "supervised", "administered", "maintained"],
      "migrated": ["moved", "transferred", "converted", "transitioned"],
      "orchestrated": ["coordinated", "managed", "arranged", "scheduled"],
      "monitored": ["tracked", "observed", "watched", "logged"],
      "integrated": ["connected", "linked", "merged", "combined", "unified"],
      "deployed": ["released", "launched", "shipped", "pushed"],
      "configured": ["set up", "established", "provisioned"],
      "led": ["headed", "managed", "directed", "oversaw", "spearheaded"],
      "collaborated": ["worked with", "partnered", "coordinated"],
      "analyzed": ["evaluated", "assessed", "examined", "reviewed"],
      "transformed": ["converted", "changed", "reshaped", "refactored"],
      "engineered": ["built", "developed", "designed", "created"],
      "streamlined": ["optimized", "simplified", "improved", "automated"],
      "established": ["set up", "created", "built", "introduced"],
    };

    for (const jdVerb of jdVerbs) {
      const synonyms = verbMapping[jdVerb] || [];
      if (synonyms.includes(firstWord) || firstWord === jdVerb) {
        // Replace with the JD's preferred verb
        if (firstWord !== jdVerb) {
          words[0] = words[0].replace(new RegExp(`^${firstWord}`, "i"),
            jdVerb.charAt(0).toUpperCase() + jdVerb.slice(1));
          rewritten = words.join(" ");
        }
        break;
      }
    }
  }

  // 2. Inject a JD tool mention if the bullet discusses a related topic but is missing the tool name
  for (const tool of jdTools) {
    if (has(rewritten, tool)) continue; // already mentioned
    // Check if the bullet context is related
    const toolLower = tool.toLowerCase();
    if (bulletContextMatchesTool(rewritten, toolLower)) {
      // Inject naturally: " using <Tool>" or " with <Tool>" or " leveraging <Tool>"
      rewritten = injectToolIntoBullet(rewritten, tool);
      break; // Only inject one tool per bullet to keep it natural
    }
  }

  return rewritten;
}

/** Check if a bullet's context relates to a tool */
function bulletContextMatchesTool(bullet: string, tool: string): boolean {
  const b = bullet.toLowerCase();

  const contextMap: Record<string, string[]> = {
    "s3": ["storage", "data lake", "bucket", "object", "archive"],
    "glue": ["etl", "extract", "transform", "catalog", "crawl"],
    "lambda": ["serverless", "function", "event-driven", "trigger"],
    "redshift": ["warehouse", "analytics", "olap", "query", "reporting"],
    "athena": ["query", "sql", "ad-hoc", "s3 data", "analyze"],
    "kinesis": ["streaming", "real-time", "event", "ingest"],
    "cloudwatch": ["monitor", "log", "alert", "metric", "dashboard"],
    "step functions": ["workflow", "orchestrat", "state machine"],
    "sagemaker": ["machine learning", "ml", "model", "training", "prediction"],
    "cloudformation": ["infrastructure", "iac", "provision", "template", "stack"],
    "ec2": ["compute", "instance", "server", "vm"],
    "rds": ["database", "relational", "sql", "postgres", "mysql"],
    "iam": ["security", "access", "permission", "role", "policy"],
    "vpc": ["network", "subnet", "security group", "firewall"],
    "azure": ["cloud", "microsoft"],
    "adls": ["data lake", "storage", "lake"],
    "synapse": ["warehouse", "analytics", "sql pool"],
    "data factory": ["etl", "pipeline", "orchestrat", "ingest"],
    "adf": ["etl", "pipeline", "orchestrat", "ingest"],
    "databricks": ["spark", "notebook", "lakehouse", "delta"],
    "event hubs": ["streaming", "real-time", "event", "ingest"],
    "key vault": ["secret", "certificate", "security", "key"],
    "cosmos db": ["nosql", "document", "database"],
    "fabric": ["analytics", "data platform", "lakehouse"],
    "power bi": ["dashboard", "report", "visualization", "bi"],
    "airflow": ["workflow", "orchestrat", "dag", "schedul"],
    "kafka": ["streaming", "event", "message", "real-time", "queue", "topic"],
    "spark": ["processing", "big data", "distributed", "transformation"],
    "terraform": ["infrastructure", "iac", "provision"],
    "docker": ["container", "deploy", "image", "microservice"],
    "kubernetes": ["container", "deploy", "cluster", "pod", "orchestrat"],
    "snowflake": ["warehouse", "analytics", "cloud data"],
    "tableau": ["dashboard", "report", "visualization", "bi"],
    "python": ["script", "automation", "develop", "process", "transform"],
    "sql": ["query", "database", "data", "report"],
    "jenkins": ["ci/cd", "build", "pipeline", "deploy", "automat"],
    "git": ["version", "source control", "repository", "code"],
    "jira": ["ticket", "agile", "sprint", "project management", "track"],
    "servicenow": ["itsm", "ticket", "incident", "workflow"],
  };

  const toolContexts = contextMap[tool] || [];
  return toolContexts.some((ctx) => b.includes(ctx));
}

/** Inject a tool name into a bullet naturally at the end, never mid-sentence */
function injectToolIntoBullet(bullet: string, tool: string): string {
  // Only append at the end — never insert mid-sentence to avoid garbled text
  if (bullet.endsWith(".")) {
    return bullet.slice(0, -1) + ` using ${tool}.`;
  }
  return bullet + ` using ${tool}.`;
}

/**
 * Generate new experience bullets for JD requirements not covered
 * by existing bullets. Uses JD verbs and aligns with the job context.
 */
// ── Bullet fingerprinting — prevent duplicates across all passes ────

/** Create a short fingerprint of a bullet to detect near-duplicates */
function bulletFingerprint(bullet: string): string {
  return bullet.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 60);
}

/** Check if a candidate bullet is too similar to any existing bullet */
function isDuplicateBullet(candidate: string, existing: string[]): boolean {
  const fp = bulletFingerprint(candidate);
  return existing.some((b) => {
    const efp = bulletFingerprint(b);
    // Exact fingerprint match or >70% overlap
    if (fp === efp) return true;
    const shorter = Math.min(fp.length, efp.length);
    if (shorter < 10) return false;
    let matches = 0;
    for (let i = 0; i < shorter; i++) {
      if (fp[i] === efp[i]) matches++;
    }
    return matches / shorter > 0.7;
  });
}

// ── Responsibility → original bullet synthesis ──────────────

/**
 * Extract the KEY CONCEPT from a JD responsibility (2–5 words), not a copy.
 * e.g. "Design, build, and operate batch and streaming data pipelines that
 * ingest from diverse sources" → "batch and streaming data pipelines"
 */
function extractKeyConcept(resp: string): string {
  const lower = resp.toLowerCase();

  // Match specific data-engineering concepts
  const conceptPatterns = [
    /\b(batch\s+and\s+streaming\s+(?:data\s+)?pipelines?)\b/i,
    /\b(real-?time\s+(?:data\s+)?(?:pipelines?|processing|streaming))\b/i,
    /\b(data\s+(?:lake(?:house)?|warehouse|platform|mesh|catalog|governance|quality|lineage|modeling))\b/i,
    /\b(ETL\/ELT\s+(?:pipelines?|workflows?|processes))\b/i,
    /\b(ETL\s+(?:pipelines?|workflows?|processes))\b/i,
    /\b(CI\/CD\s+(?:pipelines?|workflows?|automation))\b/i,
    /\b(infrastructure\s+as\s+code)\b/i,
    /\b(data\s+(?:ingestion|integration|migration|transformation|orchestration))\b/i,
    /\b(machine\s+learning\s+(?:pipelines?|models?|workflows?|platform))\b/i,
    /\b(cost\s+(?:optimization|management|reduction))\b/i,
    /\b(access\s+control|security\s+(?:policies|controls|compliance))\b/i,
    /\b(monitoring\s+and\s+(?:alerting|observability|logging))\b/i,
    /\b(self-?service\s+analytics?)\b/i,
    /\b(data\s+pipelines?)\b/i,
    /\b(cloud\s+(?:migration|infrastructure|architecture))\b/i,
    /\b(devops\/dataops\s+(?:pipelines?|workflows?|automation|practices))\b/i,
    /\b(backend\s+(?:services?|components?|APIs?))\b/i,
    /\b(design\s+docs?)\b/i,
    /\b(services?\s+and\s+APIs?)\b/i,
    /\b(security\s+and\s+networking)\b/i,
  ];
  for (const pat of conceptPatterns) {
    const m = lower.match(pat);
    if (m) return m[1];
  }

  // Fallback: take the noun phrase after the verb(s)
  let cleaned = resp
    .replace(/^(you will|the candidate will|responsible for|must be able to|ability to)\s*/i, "")
    // Remove sub-labels like "Automate and productize:" or "Collaborate & document:"
    .replace(/^[\w\s&]+:\s*/i, "")
    .replace(/\(.*?\)/g, "")
    .replace(/;.*$/, "")
    .replace(/,\s*(?:with|including|such as|ensuring|while|and\s+\w+ing)\s+.*/i, "")
    .trim();

  // If the cleaned text is still too long or starts with verbs, simplify further
  if (cleaned.length > 80) {
    // Take text up to the first comma or semicolon
    cleaned = cleaned.split(/[,;]/)[0].trim();
  }

  // Strip leading verbs (design, build, and operate → rest)
  const withoutVerbs = cleaned
    .replace(/^(?:(?:design|develop|build|implement|automate|apply|write|review|work|collaborate|harden|create|deploy|manage|operate|deliver)(?:,\s*|\s+and\s+|\s+&\s+|\s+))+/i, "")
    .trim();

  // Take first ~6 words of what remains
  const words = (withoutVerbs || cleaned).split(/\s+/).slice(0, 6);
  const result = words.join(" ").replace(/\.\s*$/, "").toLowerCase();

  // Final guard: if the concept is still too long, too short, or looks like garbage, use a safe fallback
  if (result.length < 5 || result.length > 60) return "data engineering solutions";
  return result;
}

/**
 * Synthesize a unique, specific bullet for a JD responsibility.
 * Tools are woven INTO the sentence structure, not appended.
 * Each call picks from 12+ structural templates keyed by responsibility index.
 */
function synthesizeBullet(
  resp: string,
  index: number,
  jdVerbs: string[],
  jdTools: string[],
  cloud: CloudDetectionResult
): string {
  const concept = extractKeyConcept(resp);
  const verb = jdVerbs[index % jdVerbs.length] || "Developed";
  const capVerb = verb.charAt(0).toUpperCase() + verb.slice(1);

  // Find tools that appear in this specific responsibility
  const respTools = jdTools.filter((t) => has(resp, t));
  const tool1 = respTools[0] || "";
  const tool2 = respTools[1] || "";
  const cloudLabel = cloud.cloudType !== "unknown" ? cloud.cloudType.toUpperCase() : "cloud";

  // Build tool phrase that goes INSIDE the bullet naturally
  const toolInline = tool1 ? `${tool1}${tool2 ? ` and ${tool2}` : ""}` : "";

  // 12 structural templates — each produces a genuinely different sentence
  const templates = [
    // Template 0: "Verb tool-based concept, achieving outcome"
    () => toolInline
      ? `${capVerb} ${toolInline}-based ${concept}, achieving 40% faster data delivery and improved pipeline reliability.`
      : `${capVerb} production-grade ${concept}, achieving 40% faster data delivery and improved pipeline reliability.`,

    // Template 1: "Verb concept across tool environments, reducing..."
    () => toolInline
      ? `${capVerb} ${concept} across ${toolInline} environments, reducing processing latency by 35% and eliminating manual intervention.`
      : `${capVerb} ${concept} across ${cloudLabel} environments, reducing processing latency by 35% and eliminating manual intervention.`,

    // Template 2: "Built and maintained tool concept serving N+ datasets"
    () => toolInline
      ? `Built and maintained ${toolInline} ${concept} serving 50+ datasets, enabling self-service analytics for cross-functional teams.`
      : `Built and maintained ${cloudLabel} ${concept} serving 50+ datasets, enabling self-service analytics for cross-functional teams.`,

    // Template 3: "Spearheaded concept on tool, cutting costs by..."
    () => toolInline
      ? `Spearheaded ${concept} on ${toolInline}, cutting infrastructure costs by 25% while maintaining 99.9% SLA compliance.`
      : `Spearheaded ${concept} on ${cloudLabel}, cutting infrastructure costs by 25% while maintaining 99.9% SLA compliance.`,

    // Template 4: "Architected concept with tool to handle TB-scale..."
    () => toolInline
      ? `Architected ${concept} with ${toolInline} to handle TB-scale daily ingestion, improving data freshness from hours to minutes.`
      : `Architected ${concept} to handle TB-scale daily ingestion, improving data freshness from hours to minutes.`,

    // Template 5: "Partnered with stakeholders to verb concept in tool"
    () => toolInline
      ? `Partnered with data scientists and analysts to ${verb} ${concept} in ${toolInline}, accelerating model training cycles by 30%.`
      : `Partnered with data scientists and analysts to ${verb} ${concept}, accelerating model training cycles by 30%.`,

    // Template 6: "Standardized concept using tool, enforcing governance"
    () => toolInline
      ? `Standardized ${concept} using ${toolInline}, enforcing schema governance and data quality SLAs across all production tables.`
      : `Standardized ${concept}, enforcing schema governance and data quality SLAs across all production tables.`,

    // Template 7: "Migrated legacy X to tool-powered concept"
    () => toolInline
      ? `Migrated legacy batch processes to ${toolInline}-powered ${concept}, reducing end-to-end runtime by 60%.`
      : `Migrated legacy batch processes to modern ${concept}, reducing end-to-end runtime by 60%.`,

    // Template 8: "Automated concept via tool, eliminating manual steps"
    () => toolInline
      ? `Automated ${concept} via ${toolInline}, eliminating 20+ hours of weekly manual data validation and reconciliation.`
      : `Automated ${concept}, eliminating 20+ hours of weekly manual data validation and reconciliation.`,

    // Template 9: "Owned end-to-end concept in tool, from ingestion to reporting"
    () => toolInline
      ? `Owned end-to-end ${concept} in ${toolInline}, from raw ingestion through transformation to reporting-layer delivery.`
      : `Owned end-to-end ${concept}, from raw ingestion through transformation to reporting-layer delivery.`,

    // Template 10: "Delivered concept with tool, supporting compliance"
    () => toolInline
      ? `Delivered ${concept} with ${toolInline}, supporting HIPAA/SOX compliance and passing all quarterly audit reviews.`
      : `Delivered ${concept}, supporting regulatory compliance and passing all quarterly audit reviews.`,

    // Template 11: "Led design of concept leveraging tool for high-throughput"
    () => toolInline
      ? `Led design of high-throughput ${concept} on ${toolInline}, processing 10M+ records daily with zero data loss.`
      : `Led design of high-throughput ${concept}, processing 10M+ records daily with zero data loss.`,
  ];

  return templates[index % templates.length]();
}

function generateNewBullets(
  existingBullets: string[],
  jd: ParsedJD,
  jdVerbs: string[],
  jdTools: string[],
  cloud: CloudDetectionResult
): string[] {
  const existing = existingBullets.join(" ").toLowerCase();
  const newBullets: string[] = [];
  let templateIdx = 0;

  for (const resp of jd.responsibilities) {
    const respWords = resp.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const coverageRatio = respWords.filter((w) => existing.includes(w)).length / (respWords.length || 1);

    if (coverageRatio < 0.3) {
      const bullet = synthesizeBullet(resp, templateIdx, jdVerbs, jdTools, cloud);
      if (!isDuplicateBullet(bullet, [...existingBullets, ...newBullets])) {
        newBullets.push(bullet);
        templateIdx++;
      }
      if (newBullets.length >= 3) break;
    }
  }

  return newBullets;
}

/**
 * Full experience tailoring: rewrite existing bullets + generate new ones.
 * New bullets are added to the MOST RECENT job (index 0) to keep it natural.
 */
function tailorExperience(
  experiences: ResumeExperienceItem[],
  jd: ParsedJD,
  jdVerbs: string[],
  jdTools: string[],
  cloud: CloudDetectionResult
): ResumeExperienceItem[] {
  if (experiences.length === 0) return experiences;

  // Track which JD items are covered across all bullets
  const allBullets = experiences.flatMap((e) => e.bullets);

  return experiences.map((exp, idx) => {
    // 1. Rewrite existing bullets using JD verbs and tool injection
    const rewrittenBullets = exp.bullets.map((bullet) =>
      rewriteBullet(bullet, jdVerbs, jdTools, jd)
    );

    // 2. Score and sort: most JD-relevant bullets first
    const scored = rewrittenBullets.map((bullet) => {
      const score = [...jd.mustHaves, ...jd.responsibilities].reduce(
        (s, kw) => s + (has(bullet, kw) ? 1 : 0), 0
      );
      return { bullet, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const sortedBullets = scored.map((s) => s.bullet);

    // 3. Generate new bullets — add most to the first (most recent) job,
    //    some to the second job for distribution
    if (idx === 0) {
      const newBullets = generateNewBullets(allBullets, jd, jdVerbs, jdTools, cloud);
      const combined = [...sortedBullets, ...newBullets];
      return { ...exp, bullets: combined.slice(0, 10) }; // Cap at 10 bullets per job
    }

    if (idx === 1) {
      // Add 1-2 supporting bullets to second job too
      const newBullets = generateNewBullets(
        [...allBullets, ...experiences[0].bullets],
        jd, jdVerbs, jdTools, cloud
      ).slice(0, 2);
      const combined = [...sortedBullets, ...newBullets];
      return { ...exp, bullets: combined.slice(0, 8) }; // Cap at 8 bullets per job
    }

    return { ...exp, bullets: sortedBullets.slice(0, 6) }; // Cap older jobs at 6
  });
}

/** Parse work experience section text into structured items.
 * Handles formats like:
 *   Role | Company | Jan 2020 – Present
 *   Role, Company, 2019 – 2021
 *   Role\nCompany\nJan 2020 – Present
 */
function parseExperienceFromText(text: string): ResumeExperienceItem[] {
  if (!text) return [];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const experiences: ResumeExperienceItem[] = [];
  let current: ResumeExperienceItem | null = null;

  // Date patterns
  const MONTH_DATE_RE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i;
  const YEAR_RANGE_RE = /\b\d{4}\s*[-–—]\s*(?:\d{4}|present|current)/i;
  const DATE_RE = new RegExp(
    `(${MONTH_DATE_RE.source}\\s*[-–—]\\s*(?:${MONTH_DATE_RE.source}|present|current))|(${YEAR_RANGE_RE.source})`,
    "i"
  );

  for (const line of lines) {
    const hasDate = DATE_RE.test(line);
    const isBullet = /^[-•*▪►◦]/.test(line);

    if (hasDate && !isBullet) {
      if (current) experiences.push(current);

      // Extract the date portion
      const durationMatch = line.match(DATE_RE);
      const duration = durationMatch ? durationMatch[0].trim() : "";

      // Remove date from the line to get role + company
      const withoutDate = line.replace(DATE_RE, "").replace(/\s*[|,]\s*$/, "").replace(/^\s*[|,]\s*/, "").trim();

      // Split remaining text by pipe or comma to get role vs company
      let role = withoutDate;
      let company = "";
      const pipeIdx = withoutDate.indexOf("|");
      const commaIdx = withoutDate.indexOf(",");

      if (pipeIdx > 0) {
        // "Senior Data Engineer | TechCorp" or "TechCorp | Senior Data Engineer"
        const parts = withoutDate.split("|").map((p) => p.trim());
        // Heuristic: the part with more title-like words is the role
        const TITLE_WORDS = /\b(engineer|developer|analyst|architect|manager|lead|senior|junior|specialist|consultant|administrator|director)\b/i;
        if (parts.length === 2) {
          if (TITLE_WORDS.test(parts[0])) {
            role = parts[0];
            company = parts[1];
          } else if (TITLE_WORDS.test(parts[1])) {
            role = parts[1];
            company = parts[0];
          } else {
            role = parts[0];
            company = parts[1];
          }
        } else {
          role = parts[0];
          company = parts.slice(1).join(", ");
        }
      } else if (commaIdx > 0 && commaIdx < withoutDate.length - 1) {
        const parts = withoutDate.split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          role = parts[0];
          company = parts.slice(1).join(", ");
        }
      }

      current = { role: role.replace(/[|,]\s*$/, "").trim(), company, duration, bullets: [] };
    } else if (isBullet && current) {
      current.bullets.push(line.replace(/^[-•*▪►◦]\s*/, "").trim());
    } else if (current && !isBullet && line.length < 80 && !current.company) {
      // Standalone line after a header with no company yet — treat as company name
      current.company = line;
    } else if (current) {
      current.bullets.push(line);
    }
  }

  if (current) experiences.push(current);
  return experiences;
}

/** Parse education section text into structured items */
function parseEducationFromText(text: string): ResumeEducationItem[] {
  if (!text) return [];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: ResumeEducationItem[] = [];

  for (const line of lines) {
    const yearMatch = line.match(/\b(19|20)\d{2}\b/);
    items.push({
      degree: line.replace(/\b(19|20)\d{2}\b/, "").trim(),
      institution: "",
      year: yearMatch ? yearMatch[0] : undefined,
    });
  }

  return items;
}

// ── Domain/compliance: add directly where relevant ──────────

function addDomainComplianceToSkills(
  skills: string[],
  jd: ParsedJD,
  masterText: string
): string[] {
  const toAdd: string[] = [];

  for (const kw of [...jd.domainKeywords, ...jd.complianceKeywords]) {
    const alreadyInSkills = skills.some((s) => has(s, kw));
    if (!alreadyInSkills) {
      toAdd.push(kw);
    }
  }

  if (toAdd.length > 0) {
    skills.push(`Domain & Compliance: ${toAdd.join(", ")}`);
  }

  return skills;
}

// ── Main tailoring function ─────────────────────────────────

export function tailorResume(
  master: ExtractedMasterResume,
  jd: ParsedJD,
  cloud: CloudDetectionResult
): { resume: ResumeSectionOutput; learnableSkillsAdded: string[]; placeholdersUsed: string[] } {
  // Extract JD verbs and tools for rewriting
  const jdVerbs = extractJdVerbs(jd);
  const jdTools = extractJdTools(jd);

  // Build skills (inject missing JD skills directly, filtering out non-skill items)
  const filteredJd: ParsedJD = {
    ...jd,
    mustHaves: jd.mustHaves.filter((item) => {
      if (item.length > 80) return false;
      if (/\b(bachelor|master|degree|diploma|phd|equivalent experience|related field)\b/i.test(item)) return false;
      return true;
    }),
    preferred: jd.preferred.filter((item) => {
      if (item.length > 80) return false;
      if (/\b(bachelor|master|degree|diploma|phd|equivalent experience|related field)\b/i.test(item)) return false;
      return true;
    }),
  };
  const { skills: rawSkills, skillsAdded } = buildSkillsSection(
    master.sections.skills || "",
    filteredJd,
    cloud
  );

  // Add domain/compliance keywords
  const skills = addDomainComplianceToSkills(rawSkills, jd, master.rawText);

  // Build summary (rewrite to mirror JD language)
  const summary = buildSummary(master.sections.summary || "", jd, cloud);

  // Build experience (rewrite bullets + generate new ones)
  const rawExperiences = parseExperienceFromText(master.sections.workExperience || "");
  const workExperience = tailorExperience(rawExperiences, jd, jdVerbs, jdTools, cloud);

  // Build education
  const education = parseEducationFromText(master.sections.education || "");

  // Force exact JD title — always use the JD's title verbatim
  const safeTitle = jd.title || "Data Engineer";
  const atsStrategy: string[] = [
    `Resume title matched to JD: "${safeTitle}"`,
    `Non-skill items filtered: degree/experience prose excluded from injection`,
    `Cloud platform: ${cloud.cloudType.toUpperCase()} (${cloud.reason})`,
    `Action verbs used from JD: ${jdVerbs.slice(0, 8).join(", ")}`,
    `Skills injected into Skills section: ${skillsAdded.join(", ") || "none (all already present)"}`,
    `Experience bullets rewritten with JD verbs and tool mentions`,
    `New bullets generated where JD responsibilities were not covered`,
  ];

  // Check for placeholders
  const allText = [summary, ...skills, ...workExperience.flatMap((e) => e.bullets)].join(" ");
  const placeholdersUsed: string[] = [];
  if (allText.includes("[X%]")) placeholdersUsed.push("[X%]");
  if (allText.includes("[N]")) placeholdersUsed.push("[N]");
  if (allText.includes("[$M]")) placeholdersUsed.push("[$M]");

  return {
    resume: {
      title: safeTitle,
      summary,
      skills: uniqueCI(skills),
      workExperience,
      education,
      atsStrategy,
    },
    learnableSkillsAdded: skillsAdded,
    placeholdersUsed,
  };
}

// ── Auto-correction: boost score towards target ─────────────

/**
 * Patch a tailored resume to raise the ATS score.
 * Examines each rubric category that scored below 2 and injects
 * the missing keywords / bullets to close the gap.
 * Called iteratively by the API route until score >= 9 or max attempts.
 */
export function boostResumeScore(
  resume: ResumeSectionOutput,
  jd: ParsedJD,
  cloud: CloudDetectionResult,
  rubric: ATSRubricBreakdown
): ResumeSectionOutput {
  // Deep-clone so we don't mutate the input
  const patched: ResumeSectionOutput = {
    ...resume,
    skills: [...resume.skills],
    workExperience: resume.workExperience.map((e) => ({
      ...e,
      bullets: [...e.bullets],
    })),
  };

  // 1. Title — force exact match
  if (rubric.titleExactMatch.score < 2) {
    patched.title = jd.title;
  }

  // 2. Must-Have Skills — ensure each appears in Skills AND Experience
  if (rubric.mustHaveCoverage.score < 2) {
    const cleanMustHaves = sanitizeJdKeywords(jd.mustHaves);
    const skillsText = patched.skills.join(" ");
    const expText = patched.workExperience.flatMap((e) => e.bullets).join(" ");

    // Collect skills missing from the Skills section and inject them
    for (const mh of cleanMustHaves) {
      if (!has(skillsText, mh)) {
        let injected = false;
        for (let i = 0; i < patched.skills.length; i++) {
          const colonIdx = patched.skills[i].indexOf(":");
          if (colonIdx > 0) {
            const cat = patched.skills[i].substring(0, colonIdx).toLowerCase();
            if (skillFitsCategory(mh, cat)) {
              patched.skills[i] = patched.skills[i] + `, ${mh}`;
              injected = true;
              break;
            }
          }
        }
        if (!injected) {
          const firstColon = patched.skills.findIndex((s) => s.includes(":"));
          if (firstColon >= 0) {
            patched.skills[firstColon] = patched.skills[firstColon] + `, ${mh}`;
          } else {
            patched.skills.push(`Additional Technologies: ${mh}`);
          }
        }
      }
    }

    // For experience: weave missing skills naturally into context-specific bullets
    const missingInExp = cleanMustHaves.filter((mh) => !has(expText, mh));
    if (missingInExp.length > 0 && patched.workExperience.length > 0) {
      const allExistingBullets = patched.workExperience.flatMap((e) => e.bullets);

      // Group into batches of 2-3 tools per bullet with diverse structures
      const boostTemplates = [
        (tools: string[]) => `Built ${tools[0]}-based data ingestion framework${tools[1] ? ` integrated with ${tools[1]}` : ""}, processing 5M+ records daily with automated schema validation${tools[2] ? ` and ${tools[2]} monitoring` : ""}.`,
        (tools: string[]) => `Designed ${tools[0]} transformation layer${tools[1] ? ` orchestrated through ${tools[1]}` : ""}, reducing data preparation time by 45%${tools[2] ? ` and enabling ${tools[2]} reporting` : ""}.`,
        (tools: string[]) => `Operated production ${tools[0]} workloads${tools[1] ? ` alongside ${tools[1]}` : ""} serving analytics teams, maintaining 99.9% uptime${tools[2] ? ` with ${tools[2]} alerting` : ""}.`,
        (tools: string[]) => `Implemented ${tools[0]}-driven data quality checks${tools[1] ? ` within ${tools[1]} pipelines` : ""}, catching 95% of anomalies before downstream consumption${tools[2] ? ` via ${tools[2]}` : ""}.`,
        (tools: string[]) => `Orchestrated ${tools[0]} jobs${tools[1] ? ` with ${tools[1]}` : ""} for nightly batch processing, handling TB-scale datasets${tools[2] ? ` stored in ${tools[2]}` : ""}.`,
      ];

      for (let i = 0; i < missingInExp.length; i += 3) {
        const batch = missingInExp.slice(i, i + 3);
        const bullet = boostTemplates[Math.floor(i / 3) % boostTemplates.length](batch);
        if (!isDuplicateBullet(bullet, allExistingBullets)) {
          patched.workExperience[0].bullets.push(bullet);
        }
      }
    }
  }

  // 3. Responsibilities — add unique bullets for uncovered responsibilities
  if (rubric.responsibilitiesMirrored.score < 2) {
    const jdVerbs = extractJdVerbs(jd);
    const jdTools = extractJdTools(jd);
    const allExistingBullets = patched.workExperience.flatMap((e) => e.bullets);
    let added = 0;

    for (const resp of jd.responsibilities) {
      const expText = patched.workExperience.flatMap((e) => e.bullets).join(" ");
      const words = resp.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      const hits = words.filter((w) => expText.toLowerCase().includes(w));
      const coverageRatio = hits.length / (words.length || 1);

      if (coverageRatio < 0.3 && patched.workExperience.length > 0) {
        // Use a different template offset for each boost pass to avoid repeats
        const templateOffset = allExistingBullets.length + added;
        const bullet = synthesizeBullet(resp, templateOffset, jdVerbs, jdTools, cloud);

        if (!isDuplicateBullet(bullet, allExistingBullets)) {
          const targetJob = added % 2 === 0 ? 0 : Math.min(1, patched.workExperience.length - 1);
          patched.workExperience[targetJob].bullets.push(bullet);
          added++;
        }
        if (added >= 3) break;
      }
    }
  }

  // 4. Cloud Alignment — inject missing dominant cloud keywords
  if (rubric.cloudAlignment.score < 2) {
    const allText = [
      patched.summary,
      patched.skills.join(" "),
      ...patched.workExperience.flatMap((e) => e.bullets),
    ].join(" ");

    const missingCloud = cloud.dominantKeywords.filter((kw) => !has(allText, kw));

    // Inject into skills
    if (missingCloud.length > 0) {
      const cloudLine = patched.skills.find(
        (s) => s.toLowerCase().includes("cloud") || s.toLowerCase().includes("platform")
      );
      if (cloudLine) {
        const idx = patched.skills.indexOf(cloudLine);
        patched.skills[idx] = cloudLine + `, ${missingCloud.join(", ")}`;
      } else {
        patched.skills.push(`Cloud Platforms & Services: ${missingCloud.join(", ")}`);
      }
    }

    // Inject into experience bullets for remaining gaps — one consolidated bullet
    if (missingCloud.length > 0 && patched.workExperience.length > 0) {
      const cloudCtx = cloud.cloudType !== "unknown" ? `${cloud.cloudType.toUpperCase()} ` : "";
      const bullet = `Configured and managed ${cloudCtx}services including ${missingCloud.join(", ")}, ensuring high availability, security compliance, and cost optimization across environments.`;
      const allBullets = patched.workExperience.flatMap((e) => e.bullets);
      if (!isDuplicateBullet(bullet, allBullets)) {
        patched.workExperience[0].bullets.push(bullet);
      }
    }
  }

  // 5. Domain & Formatting — inject domain/compliance keywords if missing
  if (rubric.domainAndFormatting.score < 2) {
    const allText = [
      patched.summary,
      patched.skills.join(" "),
      ...patched.workExperience.flatMap((e) => e.bullets),
    ].join(" ");

    const missingDomain = [...jd.domainKeywords, ...jd.complianceKeywords].filter(
      (kw) => !has(allText, kw)
    );
    if (missingDomain.length > 0) {
      patched.skills.push(`Domain & Compliance: ${missingDomain.join(", ")}`);
    }
  }

  // De-duplicate skill lines
  patched.skills = uniqueCI(patched.skills);

  // Final guard: cap bullets per job to prevent bloat across multiple boost passes
  for (const exp of patched.workExperience) {
    const maxBullets = patched.workExperience.indexOf(exp) === 0 ? 10 : 8;
    if (exp.bullets.length > maxBullets) {
      exp.bullets = exp.bullets.slice(0, maxBullets);
    }
  }

  return patched;
}
