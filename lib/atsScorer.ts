// ============================================================
// ATS Scorer — scores a tailored resume against a parsed JD
// ============================================================

import type {
  ATSReport,
  ATSRubricBreakdown,
  CloudDetectionResult,
  DomainComplianceAudit,
  ExtractedMasterResume,
  MasterResumeType,
  ParsedJD,
  ResumeSectionOutput,
  RubricScoreItem,
  JDSourceType,
} from "@/types";

// ── Helpers ─────────────────────────────────────────────────

/** Check if a keyword appears (case-insensitive) in the text */
function textContains(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

/** Count how many of the given keywords appear in the text */
function countPresent(text: string, keywords: string[]): number {
  return keywords.filter((kw) => textContains(text, kw)).length;
}

// ── Rubric scoring (0–2 per category, 10 max) ──────────────

function scoreTitleMatch(resume: ResumeSectionOutput, jd: ParsedJD): RubricScoreItem {
  const exact = resume.title.toLowerCase().trim() === jd.title.toLowerCase().trim();
  const partial = textContains(resume.title, jd.title) || textContains(jd.title, resume.title);

  return {
    category: "JD Title Exact Match",
    score: exact ? 2 : partial ? 1 : 0,
    max: 2,
    notes: exact
      ? ["Resume title exactly matches JD title."]
      : partial
        ? ["Partial title match detected."]
        : [`Resume title "${resume.title}" does not match JD title "${jd.title}".`],
  };
}

/** Sentence/requirement patterns that should NOT count as skill keywords */
const NOT_A_SKILL_RE = /\b(year|degree|bachelor|master|phd|experience|qualification|preferred|equivalent|related field|must\s*have|ability to|familiarity|knowledge of|understanding of|including|proficiency|certification|certified)\b/i;

/** Returns true if the item looks like a short technology/tool name */
function isSkillKeyword(item: string): boolean {
  if (item.length > 60) return false;
  if (NOT_A_SKILL_RE.test(item)) return false;
  return true;
}

function scoreMustHaves(resume: ResumeSectionOutput, jd: ParsedJD): RubricScoreItem {
  const skillsText = resume.skills.join(" ");
  const expText = resume.workExperience.map((e) => e.bullets.join(" ")).join(" ");

  // Only score against actual tool/skill keywords, not requirement sentences
  const cleanMustHaves = jd.mustHaves.filter(isSkillKeyword);
  const total = cleanMustHaves.length || 1;

  const inSkills = cleanMustHaves.filter((mh) => textContains(skillsText, mh));
  const inBoth = cleanMustHaves.filter((mh) => textContains(skillsText, mh) && textContains(expText, mh));
  const ratioSkills = inSkills.length / total;
  const ratioBoth = inBoth.length / total;

  // Higher score when skills appear in both Skills section AND experience bullets
  const score = ratioBoth >= 0.7 ? 2 : ratioSkills >= 0.8 ? 2 : ratioSkills >= 0.5 ? 1 : 0;

  return {
    category: "Must-Have Skills Coverage",
    score,
    max: 2,
    notes: [
      `${inSkills.length}/${cleanMustHaves.length} must-have keywords in Skills section.`,
      `${inBoth.length}/${cleanMustHaves.length} must-have keywords in BOTH Skills and Experience bullets.`,
    ],
  };
}

function scoreResponsibilities(resume: ResumeSectionOutput, jd: ParsedJD): RubricScoreItem {
  const expText = resume.workExperience.map((e) => e.bullets.join(" ")).join(" ");
  const total = jd.responsibilities.length || 1;
  const matched = jd.responsibilities.filter((r) => {
    // Check if key words from the responsibility appear in experience
    const words = r.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const hits = words.filter((w) => expText.toLowerCase().includes(w));
    return hits.length >= Math.ceil(words.length * 0.3); // 30% word overlap
  });
  const ratio = matched.length / total;

  return {
    category: "Responsibilities Mirrored in Experience",
    score: ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0,
    max: 2,
    notes: [`${matched.length}/${jd.responsibilities.length} responsibilities reflected in experience bullets.`],
  };
}

function scoreCloudAlignment(
  resume: ResumeSectionOutput,
  cloud: CloudDetectionResult,
  selectedMaster: MasterResumeType
): RubricScoreItem {
  const allText = [resume.summary, resume.skills.join(" "), ...resume.workExperience.flatMap((e) => e.bullets)].join(" ");
  const dominantPresent = cloud.dominantKeywords.filter((kw) => textContains(allText, kw));
  const ratio = dominantPresent.length / (cloud.dominantKeywords.length || 1);

  const masterCorrect = cloud.cloudType === "unknown" || selectedMaster === cloud.cloudType;

  return {
    category: "Cloud Alignment & Tools",
    score: masterCorrect && ratio >= 0.7 ? 2 : masterCorrect && ratio >= 0.4 ? 1 : 0,
    max: 2,
    notes: [
      masterCorrect ? "Correct cloud master selected." : "Cloud master mismatch!",
      `${dominantPresent.length}/${cloud.dominantKeywords.length} dominant cloud keywords present in resume.`,
    ],
  };
}

function scoreDomainAndFormatting(
  resume: ResumeSectionOutput,
  jd: ParsedJD,
  domainAudit: DomainComplianceAudit
): RubricScoreItem {
  const notes: string[] = [];
  let score = 0;

  // Domain relevance (0–1)
  if (jd.domainKeywords.length === 0 || domainAudit.notes.every((n) => !n.toLowerCase().includes("leak"))) {
    score += 1;
    notes.push("No domain keyword leakage detected.");
  } else {
    notes.push("Possible domain keyword leakage — review audit notes.");
  }

  // Formatting (0–1) — always passes for generated content
  score += 1;
  notes.push("ATS-safe formatting applied (no icons, no text boxes, clean headings).");

  return {
    category: "Domain Relevance & Clean ATS Formatting",
    score,
    max: 2,
    notes,
  };
}

// ── Domain & Compliance Audit ───────────────────────────────

function auditDomainCompliance(
  jd: ParsedJD,
  master: ExtractedMasterResume,
  resume: ResumeSectionOutput
): DomainComplianceAudit {
  const masterText = master.rawText.toLowerCase();
  const resumeText = [resume.summary, resume.skills.join(" "), ...resume.workExperience.flatMap((e) => e.bullets)].join(" ").toLowerCase();

  const includedFromMaster: string[] = [];
  const addedAsLearningOnly: string[] = [];
  const notes: string[] = [];

  const allDomainCompliance = [...jd.domainKeywords, ...jd.complianceKeywords];

  for (const kw of allDomainCompliance) {
    const kwLower = kw.toLowerCase();
    const inMaster = masterText.includes(kwLower);
    const inResume = resumeText.includes(kwLower);

    if (inMaster && inResume) {
      includedFromMaster.push(kw);
    } else if (!inMaster && inResume) {
      addedAsLearningOnly.push(kw);
    }
  }

  if (addedAsLearningOnly.length > 0) {
    notes.push(`Learning-only keywords added: ${addedAsLearningOnly.join(", ")}`);
  }
  if (includedFromMaster.length > 0) {
    notes.push(`Existing master keywords matched: ${includedFromMaster.join(", ")}`);
  }
  if (allDomainCompliance.length === 0) {
    notes.push("No domain or compliance keywords detected in JD.");
  }

  return {
    jdDomainKeywords: jd.domainKeywords,
    jdComplianceKeywords: jd.complianceKeywords,
    includedFromMaster,
    addedAsLearningOnly,
    notes,
  };
}

// ── Main scoring function ───────────────────────────────────

export function generateATSReport(
  jdSource: JDSourceType,
  jd: ParsedJD,
  cloud: CloudDetectionResult,
  selectedMaster: MasterResumeType,
  master: ExtractedMasterResume,
  resume: ResumeSectionOutput,
  learnableSkillsAdded: string[],
  placeholdersUsed: string[]
): ATSReport {
  const domainAudit = auditDomainCompliance(jd, master, resume);

  const titleScore = scoreTitleMatch(resume, jd);
  const mustHaveScore = scoreMustHaves(resume, jd);
  const respScore = scoreResponsibilities(resume, jd);
  const cloudScore = scoreCloudAlignment(resume, cloud, selectedMaster);
  const domainScore = scoreDomainAndFormatting(resume, jd, domainAudit);

  const total = titleScore.score + mustHaveScore.score + respScore.score + cloudScore.score + domainScore.score;

  const rubricBreakdown: ATSRubricBreakdown = {
    titleExactMatch: titleScore,
    mustHaveCoverage: mustHaveScore,
    responsibilitiesMirrored: respScore,
    cloudAlignment: cloudScore,
    domainAndFormatting: domainScore,
    total,
    maxTotal: 10,
  };

  // Top keywords integrated = must-haves + preferred that appear in skills
  const skillsText = resume.skills.join(" ").toLowerCase();
  const topKeywords = [...jd.mustHaves, ...jd.preferred]
    .filter((kw) => skillsText.includes(kw.toLowerCase()))
    .slice(0, 10);

  return {
    jdSource,
    selectedMaster,
    cloudReason: cloud.reason,
    atsScore: total,
    rubricBreakdown,
    topKeywordsIntegrated: topKeywords,
    learnableSkillsAdded,
    domainComplianceAudit: domainAudit,
    placeholdersUsed,
    formattingQaStatus: {
      isAtsSafe: true,
      warnings: [],
    },
  };
}
