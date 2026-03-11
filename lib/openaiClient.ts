// ============================================================
// OpenAI Client — AI-powered resume tailoring
// ============================================================

import OpenAI from "openai";
import type {
  ParsedJD,
  CloudDetectionResult,
  ExtractedMasterResume,
  ResumeSectionOutput,
  ResumeExperienceItem,
  ResumeEducationItem,
} from "@/types";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// ── The Master Prompt ───────────────────────────────────────

const SYSTEM_PROMPT = `You are an elite ATS Resume Optimization Engine. Your ONLY job is to take a master resume and a job description, then produce a perfectly tailored resume that scores 9-10/10 on ATS systems.

## SCORING RUBRIC (you must satisfy ALL 5 categories, 2 points each = 10 max):

1. **Title Exact Match (2 pts)**: The resume title MUST be the EXACT job title from the JD. Not similar — EXACT.

2. **Must-Have Skills Coverage (2 pts)**: Every single must-have skill/technology from the JD must appear in BOTH:
   - The Skills section (listed explicitly)
   - At least one Experience bullet (used in context, not just appended)
   Score 2 requires ≥70% coverage in BOTH places, or ≥80% in Skills section.

3. **Responsibilities Mirrored (2 pts)**: Every JD responsibility must be reflected in experience bullets. Score 2 requires ≥70% of responsibilities to have ≥30% word overlap with experience bullets. Use the SAME terminology and action verbs from the JD.

4. **Cloud Alignment (2 pts)**: All dominant cloud keywords from the JD must appear naturally throughout the resume (summary, skills, and bullets). If the JD says "EC2" — write about EC2 specifically, don't just say "compute."

5. **Domain & Formatting (2 pts)**: Include relevant domain keywords (Federal, Healthcare, Finance, etc.) and compliance terms (NIST, HIPAA, FedRAMP, etc.) found in the JD. No icons, tables, text boxes, or fancy formatting.

## CRITICAL RULES:

### What you MUST do:
- Mirror the JD's EXACT phrasing and terminology throughout the resume
- Use action verbs that appear in the JD responsibilities (e.g., if JD says "Advise", use "Advised")
- For EVERY must-have skill, weave it into a specific, detailed experience bullet with quantified impact
- For EVERY responsibility listed in the JD, ensure at least one bullet addresses it directly
- Add skills/technologies from the JD that are missing from the master resume — place them in the correct skill category AND create believable experience bullets
- Keep the candidate's real job history (companies, dates, titles) — NEVER fabricate employers or dates
- Write bullets in past tense for previous roles, present tense for current role
- Every bullet must follow: [Action Verb] + [What you did] + [Using what tool/technology] + [Quantified impact/result]
- Include cloud services at the SPECIFIC service level (not just "AWS" — say "EC2, VPC, S3, Lambda")

### What you MUST NOT do:
- Never write generic filler bullets like "Developed scalable data solutions utilizing X to meet business requirements"
- Never just append "utilizing Python" or "using X" at the end of existing bullets
- Never repeat the same bullet structure more than twice
- Never use buzzwords without context (don't say "leveraged" or "utilized" without specifics)
- Never add skills that have zero relation to the candidate's background
- Never create more than 8 bullets per job (aim for 5-7)
- Never reorder sections — keep: Summary, Skills, Work Experience, Education

### Bullet Writing Formula:
GOOD: "Architected VPC networking across 3 AWS accounts with private subnets, NAT gateways, and VPC peering, reducing cross-account latency by 40% while maintaining FedRAMP compliance."
BAD: "Developed scalable data solutions utilizing VPC to meet business requirements and improve operational efficiency."

GOOD: "Automated infrastructure provisioning using CloudFormation templates for EC2, RDS, and Lambda stacks, cutting deployment time from 4 hours to 15 minutes across staging and production environments."
BAD: "Configured and managed CloudFormation environments to ensure high availability, security, and optimal performance."

### Summary Writing Rules:
- First sentence: "Results-driven [EXACT JD TITLE] with [X]+ years of experience..."
- Include the top 5-6 must-have skills/technologies from the JD
- Reference the specific domain (Federal, Healthcare, etc.) if mentioned in JD
- End with a value statement about what the candidate delivers
- Keep to 3-4 sentences maximum

### Skills Section Rules:
- Maintain the original category structure from the master resume
- Add missing JD skills into the appropriate existing categories
- If a skill doesn't fit any category, create a minimal new category
- Prioritize lines containing must-have skills to appear first
- Never duplicate a skill across categories`;

function buildTailoringPrompt(
  master: ExtractedMasterResume,
  jd: ParsedJD,
  cloud: CloudDetectionResult
): string {
  return `## JOB DESCRIPTION ANALYSIS

**Job Title**: ${jd.title}
**Location**: ${jd.location}
**Cloud Focus**: ${cloud.cloudType.toUpperCase()} (Keywords: ${cloud.dominantKeywords.join(", ")})

**Must-Have Skills** (EVERY one must appear in Skills + Experience):
${jd.mustHaves.map((s) => `- ${s}`).join("\n")}

**Preferred Skills** (include as many as believable):
${jd.preferred.map((s) => `- ${s}`).join("\n")}

**Responsibilities** (EVERY one must be mirrored in experience bullets):
${jd.responsibilities.map((r) => `- ${r}`).join("\n")}

**Domain Keywords**: ${jd.domainKeywords.join(", ") || "None detected"}
**Compliance Keywords**: ${jd.complianceKeywords.join(", ") || "None detected"}

---

## MASTER RESUME (candidate's real background — preserve companies, dates, education):

${master.rawText}

---

## YOUR TASK

Produce a fully tailored resume as JSON with this EXACT structure:
{
  "title": "exact JD title",
  "summary": "3-4 sentence summary",
  "skills": ["Category1: skill1, skill2, ...", "Category2: skill1, ..."],
  "workExperience": [
    {
      "role": "original role title from master | company name",
      "company": "company name",
      "duration": "date range",
      "bullets": ["bullet1", "bullet2", ...]
    }
  ],
  "education": [
    { "degree": "degree name", "institution": "school name", "year": "year" }
  ]
}

IMPORTANT:
- Keep the SAME companies and dates from the master resume
- Rewrite ALL bullets to directly address JD requirements using JD terminology
- Every must-have skill must appear in at least one bullet with specific context
- Every JD responsibility must be reflected in at least one bullet
- The resume title must be: "${jd.title}"
- Return ONLY valid JSON, no markdown fences, no explanation`;
}

// ── AI Tailoring Function ───────────────────────────────────

export async function aiTailorResume(
  master: ExtractedMasterResume,
  jd: ParsedJD,
  cloud: CloudDetectionResult,
  customInstructions?: string
): Promise<ResumeSectionOutput | null> {
  const client = getClient();
  if (!client) return null;

  let userPrompt = buildTailoringPrompt(master, jd, cloud);

  // Append custom instructions if provided
  if (customInstructions?.trim()) {
    userPrompt += `\n\n---\n\n## CUSTOM INSTRUCTIONS FROM USER\nThe user has provided the following additional instructions. Honor them within truth and ATS safety constraints — do not fabricate experience or credentials that are not in the master resume.\n\n${customInstructions.trim()}`;
  }

  try {
    console.log("[AI Tailor] Calling OpenAI GPT-4o for resume tailoring...");
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 8000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    console.log("[AI Tailor] Response received, length:", content?.length || 0);
    if (!content) {
      console.error("[AI Tailor] Empty response from OpenAI");
      return null;
    }

    // Parse JSON — handle cases where model wraps in markdown fences
    const jsonStr = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonStr);
    console.log("[AI Tailor] JSON parsed successfully");

    // Validate and map to ResumeSectionOutput
    const resume: ResumeSectionOutput = {
      title: parsed.title || jd.title,
      summary: parsed.summary || "",
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      workExperience: Array.isArray(parsed.workExperience)
        ? parsed.workExperience.map((exp: Record<string, unknown>) => ({
            role: (exp.role as string) || "",
            company: (exp.company as string) || "",
            duration: (exp.duration as string) || "",
            bullets: Array.isArray(exp.bullets) ? exp.bullets as string[] : [],
          }))
        : [],
      education: Array.isArray(parsed.education)
        ? parsed.education.map((edu: Record<string, unknown>) => ({
            degree: (edu.degree as string) || "",
            institution: (edu.institution as string) || "",
            year: (edu.year as string) || undefined,
          }))
        : [],
      atsStrategy: [
        "AI-powered tailoring with GPT-4o",
        `Resume title matched to JD: "${jd.title}"`,
        `Cloud platform: ${cloud.cloudType.toUpperCase()}`,
        `Must-have skills targeted: ${jd.mustHaves.join(", ")}`,
        `JD responsibilities mapped to experience bullets`,
      ],
    };

    return resume;
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    console.error("[AI Tailor] FAILED:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return null;
  }
}

// ── AI Boost Function (fix weak scoring areas) ──────────────

export async function aiBoostResume(
  resume: ResumeSectionOutput,
  jd: ParsedJD,
  cloud: CloudDetectionResult,
  weakCategories: string[]
): Promise<ResumeSectionOutput | null> {
  const client = getClient();
  if (!client) return null;

  const currentResumeJson = JSON.stringify(resume, null, 2);

  const boostPrompt = `The following tailored resume scored below target on these ATS categories:
${weakCategories.map((c) => `- ${c}`).join("\n")}

## CURRENT RESUME (JSON):
${currentResumeJson}

## JOB DESCRIPTION REQUIREMENTS:
- Title: ${jd.title}
- Must-Haves: ${jd.mustHaves.join(", ")}
- Responsibilities: ${jd.responsibilities.join(" | ")}
- Cloud Keywords: ${cloud.dominantKeywords.join(", ")}
- Domain: ${jd.domainKeywords.join(", ")}
- Compliance: ${jd.complianceKeywords.join(", ")}

## FIX INSTRUCTIONS:
For each weak category, surgically fix the resume:
- "JD Title Exact Match": Set title to exactly "${jd.title}"
- "Must-Have Skills Coverage": Add missing skills to BOTH Skills section AND at least one experience bullet each (with specific context, NOT generic filler)
- "Responsibilities Mirrored": Add/rewrite bullets to directly address uncovered responsibilities using JD terminology
- "Cloud Alignment": Inject missing cloud keywords naturally into existing bullets and skills
- "Domain Relevance & Clean ATS Formatting": Add domain/compliance keywords into relevant bullets and skills

Return the FIXED resume as valid JSON with the same structure. No markdown fences, no explanation.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      max_tokens: 8000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: boostPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    console.log("[AI Boost] Response received, length:", content?.length || 0);
    if (!content) {
      console.error("[AI Boost] Empty response from OpenAI");
      return null;
    }

    const jsonStr = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonStr);
    console.log("[AI Boost] JSON parsed successfully");

    return {
      title: parsed.title || jd.title,
      summary: parsed.summary || resume.summary,
      skills: Array.isArray(parsed.skills) ? parsed.skills : resume.skills,
      workExperience: Array.isArray(parsed.workExperience)
        ? parsed.workExperience.map((exp: Record<string, unknown>) => ({
            role: (exp.role as string) || "",
            company: (exp.company as string) || "",
            duration: (exp.duration as string) || "",
            bullets: Array.isArray(exp.bullets) ? exp.bullets as string[] : [],
          }))
        : resume.workExperience,
      education: Array.isArray(parsed.education)
        ? parsed.education.map((edu: Record<string, unknown>) => ({
            degree: (edu.degree as string) || "",
            institution: (edu.institution as string) || "",
            year: (edu.year as string) || undefined,
          }))
        : resume.education,
      atsStrategy: [
        ...resume.atsStrategy,
        `AI boost pass: fixed ${weakCategories.join(", ")}`,
      ],
    };
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    console.error("[AI Boost] FAILED:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return null;
  }
}

/** Check if AI is available (API key configured) */
export function isAIEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
