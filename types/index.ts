// ============================================================
// ATS Resume Tailor — Core Type Definitions
// ============================================================

/** Which cloud platform the JD targets */
export type CloudType = "aws" | "azure" | "unknown";

/** Which master resume to use */
export type MasterResumeType = "aws" | "azure";

/** How the JD was obtained */
export type JDSourceType = "text" | "url" | "ambiguous" | "none";

// ── Job Input ───────────────────────────────────────────────
/** Fields the user can provide to identify a job */
export interface JobInput {
  jobId?: string;
  companyName?: string;
  jdUrl?: string;
  jdText?: string;
}

// ── Parsed JD ───────────────────────────────────────────────
export interface ParsedJD {
  title: string;
  location: string;
  mustHaves: string[];
  preferred: string[];
  responsibilities: string[];
  domainKeywords: string[];
  complianceKeywords: string[];
  repeatedPhrases: string[];
  rawText: string;
}

// ── Contact Info ────────────────────────────────────────────
export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
}

// ── Resume Sections ─────────────────────────────────────────
export interface ResumeExperienceItem {
  role: string;
  company: string;
  duration: string;
  bullets: string[];
}

export interface ResumeEducationItem {
  degree: string;
  institution: string;
  year?: string;
}

export interface ResumeSectionOutput {
  title: string;
  summary: string;
  skills: string[];
  workExperience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  atsStrategy: string[];
}

// ── ATS Scoring ─────────────────────────────────────────────
export interface RubricScoreItem {
  category: string;
  score: number;
  max: number;
  notes: string[];
}

export interface ATSRubricBreakdown {
  titleExactMatch: RubricScoreItem;
  mustHaveCoverage: RubricScoreItem;
  responsibilitiesMirrored: RubricScoreItem;
  cloudAlignment: RubricScoreItem;
  domainAndFormatting: RubricScoreItem;
  total: number;
  maxTotal: number;
}

export interface DomainComplianceAudit {
  jdDomainKeywords: string[];
  jdComplianceKeywords: string[];
  includedFromMaster: string[];
  addedAsLearningOnly: string[];
  notes: string[];
}

export interface ATSFormattingQaStatus {
  isAtsSafe: boolean;
  warnings: string[];
}

export interface ATSReport {
  jdSource: JDSourceType;
  selectedMaster: MasterResumeType;
  cloudReason: string;
  atsScore: number;
  rubricBreakdown: ATSRubricBreakdown;
  topKeywordsIntegrated: string[];
  learnableSkillsAdded: string[];
  domainComplianceAudit: DomainComplianceAudit;
  placeholdersUsed: string[];
  formattingQaStatus: ATSFormattingQaStatus;
}

// ── Cloud Detection ─────────────────────────────────────────
export interface CloudDetectionResult {
  cloudType: CloudType;
  awsCount: number;
  azureCount: number;
  dominantKeywords: string[];
  reason: string;
}

// ── JD Fetching ─────────────────────────────────────────────
export interface JDFetchResult {
  success: boolean;
  url: string;
  text?: string;
  message?: string;
  statusCode?: number;
}

export interface JDResolutionResult {
  success: boolean;
  source: JDSourceType;
  jdText?: string;
  message?: string;
  warnings?: string[];
  metadata?: {
    url?: string;
    jobId?: string;
    companyName?: string;
  };
}

// ── API Responses ───────────────────────────────────────────
export interface TailorResumeResponse {
  success: true;
  parsedJD: ParsedJD;
  selectedMaster: MasterResumeType;
  cloudDetection: CloudDetectionResult;
  resume: ResumeSectionOutput;
  report: ATSReport;
  contactInfo: ContactInfo;
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "MISSING_MASTER_RESUME"
  | "JD_RETRIEVAL_ERROR"
  | "JD_AMBIGUOUS"
  | "PARSING_ERROR"
  | "GENERATION_ERROR";

export interface ErrorResponse {
  success: false;
  error: string;
  code?: ErrorCode;
  details?: string;
}

// ── Extracted Master Resume Content ─────────────────────────
export interface ExtractedMasterResume {
  rawText: string;
  contactInfo: ContactInfo;
  sections: {
    summary?: string;
    skills?: string;
    workExperience?: string;
    education?: string;
  };
}
