// ============================================================
// Resume Extractor — reads DOCX master resume into text/sections
// ============================================================

import mammoth from "mammoth";
import type { ContactInfo, ExtractedMasterResume } from "@/types";

/**
 * Extract plain text from a DOCX file buffer using mammoth.
 * Returns the raw text and attempts to split it into resume sections.
 */
export async function extractResumeFromDocx(buffer: Buffer): Promise<ExtractedMasterResume> {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value;

  const sections = splitIntoSections(rawText);
  const contactInfo = extractContactInfo();

  return { rawText, contactInfo, sections };
}

/**
 * Heuristic section splitter — identifies SUMMARY, SKILLS,
 * WORK EXPERIENCE, EDUCATION headings in the extracted text.
 */
function splitIntoSections(text: string): ExtractedMasterResume["sections"] {
  const headingPatterns: { key: keyof ExtractedMasterResume["sections"]; pattern: RegExp }[] = [
    {
      key: "summary",
      pattern: /\b(PROFESSIONAL\s+SUMMARY|EXECUTIVE\s+SUMMARY|CAREER\s+SUMMARY|SUMMARY\s+OF\s+QUALIFICATIONS|SUMMARY|PROFILE|OBJECTIVE)\b/i,
    },
    {
      key: "skills",
      pattern: /\b(TECHNICAL\s+SKILLS|KEY\s+SKILLS|PROFESSIONAL\s+SKILLS|RELEVANT\s+SKILLS|SKILLS\s+(?:&|AND)\s+\w+|SKILLS\s+SUMMARY|SKILL\s*SET|SKILLS|CORE\s+COMPETENCIES|KEY\s+COMPETENCIES|COMPETENCIES|TECHNICAL\s+PROFICIENCIES|PROFICIENCIES|TECHNICAL\s+EXPERTISE|AREAS\s+OF\s+EXPERTISE|TOOLS\s+(?:&|AND)\s+TECHNOLOGIES|TECHNOLOGIES)\b/i,
    },
    {
      key: "workExperience",
      pattern: /\b(WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|RELEVANT\s+EXPERIENCE|CAREER\s+HISTORY|EXPERIENCE|EMPLOYMENT\s+HISTORY|EMPLOYMENT)\b/i,
    },
    {
      key: "education",
      pattern: /\b(EDUCATION\s+(?:&|AND)\s+CERTIFICATIONS?|CERTIFICATIONS?\s*(?:&|AND)?\s*EDUCATION|EDUCATION|ACADEMIC|CERTIFICATIONS?)\b/i,
    },
  ];

  // Normalise non-ASCII whitespace/dashes that mammoth may produce
  const normalised = text.replace(/[\u2013\u2014]/g, "-").replace(/[\u00A0]/g, " ");
  const lines = normalised.split("\n");
  const sectionStarts: { key: string; index: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    for (const { key, pattern } of headingPatterns) {
      // A section heading is usually a short line (< 80 chars) that matches the pattern
      if (trimmed.length < 80 && pattern.test(trimmed)) {
        // Avoid duplicate sections — keep the first match for each key
        if (!sectionStarts.some((s) => s.key === key)) {
          sectionStarts.push({ key, index: i });
        }
        break;
      }
    }
  }

  // Sort by line index
  sectionStarts.sort((a, b) => a.index - b.index);

  const sections: ExtractedMasterResume["sections"] = {};

  for (let s = 0; s < sectionStarts.length; s++) {
    const start = sectionStarts[s].index + 1; // skip the heading line itself
    const end = s + 1 < sectionStarts.length ? sectionStarts[s + 1].index : lines.length;
    const content = lines.slice(start, end).join("\n").trim();
    const key = sectionStarts[s].key as keyof ExtractedMasterResume["sections"];
    sections[key] = content;
  }

  // ── Fallback: if no skills section was found, try to detect skill-like
  // lines from the raw text (lines matching "Category: item1, item2, ...")
  if (!sections.skills) {
    const skillLines: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      // Skill line heuristic: "Category Name: value, value, ..."
      if (
        t.length > 10 &&
        t.length < 200 &&
        /^[A-Za-z &/]+:\s*.+,/.test(t) &&
        !/\b(http|www\.|@|phone|email|address)\b/i.test(t)
      ) {
        skillLines.push(t);
      }
    }
    if (skillLines.length >= 2) {
      sections.skills = skillLines.join("\n");
    }
  }

  return sections;
}

/**
 * Fixed contact header — used consistently on every generated resume.
 */
function extractContactInfo(): ContactInfo {
  return {
    name: "Sai Susmitha K",
    email: "ksusmitha10@gmail.com",
    phone: "+1 (913)-565-8659",
    linkedin: "",
    location: "United States | Open to Relocate",
  };
}
