// ============================================================
// Cloud Detector — determines AWS vs Azure dominance from JD
// ============================================================

import { CloudDetectionResult, CloudType } from "@/types";

// Keywords that signal an AWS-focused role
export const AWS_KEYWORDS: string[] = [
  "AWS", "S3", "Glue", "Lambda", "EC2", "VPC", "RDS", "Redshift",
  "Athena", "Kinesis", "IAM", "CloudWatch", "Step Functions",
  "SageMaker", "CloudFormation",
];

// Keywords that signal an Azure-focused role
export const AZURE_KEYWORDS: string[] = [
  "Azure", "ADLS", "ADLS Gen2", "Synapse", "Data Factory", "ADF",
  "Databricks", "Event Hubs", "Functions", "Key Vault", "Azure DevOps",
  "Monitor", "Log Analytics", "Fabric", "Cosmos DB", "Azure SQL",
];

/** Escape special regex characters in a string */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Count how many times a keyword (possibly multi-word) appears in text */
function countKeywordOccurrences(text: string, keyword: string): number {
  const pattern = keyword
    .trim()
    .split(/\s+/)
    .map((part) => escapeRegExp(part))
    .join("\\s+");
  const regex = new RegExp(`\\b${pattern}\\b`, "gi");
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/** Build a map of keyword → count for a list of keywords */
function keywordCounts(text: string, keywords: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const keyword of keywords) {
    counts[keyword] = countKeywordOccurrences(text, keyword);
  }
  return counts;
}

/** Sum all values in a counts map */
function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, v) => total + v, 0);
}

/** Get top N keywords by count */
function getTopKeywords(counts: Record<string, number>, limit = 8): string[] {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

/**
 * Detect whether a JD is AWS-focused or Azure-focused
 * by counting keyword occurrences.
 */
export function detectCloudDominance(jdText: string): CloudDetectionResult {
  const awsCounts = keywordCounts(jdText, AWS_KEYWORDS);
  const azureCounts = keywordCounts(jdText, AZURE_KEYWORDS);

  const awsTotal = sumCounts(awsCounts);
  const azureTotal = sumCounts(azureCounts);

  // No cloud keywords found
  if (awsTotal === 0 && azureTotal === 0) {
    return {
      cloudType: "unknown",
      awsCount: 0,
      azureCount: 0,
      dominantKeywords: [],
      reason: "No strong AWS or Azure keyword signals were detected in the JD text.",
    };
  }

  let cloudType: CloudType;
  let tieBreakNote = "";

  if (awsTotal > azureTotal) {
    cloudType = "aws";
  } else if (azureTotal > awsTotal) {
    cloudType = "azure";
  } else {
    // Tie-break: whichever appears first in the text
    const lowerText = jdText.toLowerCase();
    const firstAws = lowerText.indexOf("aws");
    const firstAzure = lowerText.indexOf("azure");
    if (firstAws !== -1 && (firstAzure === -1 || firstAws <= firstAzure)) {
      cloudType = "aws";
      tieBreakNote = " Keyword counts tied; AWS selected (mentioned first).";
    } else {
      cloudType = "azure";
      tieBreakNote = " Keyword counts tied; Azure selected (mentioned first).";
    }
  }

  const dominantKeywords =
    cloudType === "aws" ? getTopKeywords(awsCounts) : getTopKeywords(azureCounts);

  return {
    cloudType,
    awsCount: awsTotal,
    azureCount: azureTotal,
    dominantKeywords,
    reason: `Detected ${cloudType.toUpperCase()} dominance: AWS=${awsTotal}, Azure=${azureTotal}. Top ${cloudType.toUpperCase()} keywords: ${dominantKeywords.join(", ") || "none"}.${tieBreakNote}`,
  };
}
