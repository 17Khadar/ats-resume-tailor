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
    { key: "summary", pattern: /\b(PROFESSIONAL\s+SUMMARY|SUMMARY|PROFILE|OBJECTIVE)\b/i },
    { key: "skills", pattern: /\b(TECHNICAL\s+SKILLS|SKILLS|CORE\s+COMPETENCIES|TECHNOLOGIES)\b/i },
    { key: "workExperience", pattern: /\b(WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|EXPERIENCE|EMPLOYMENT\s+HISTORY)\b/i },
    { key: "education", pattern: /\b(EDUCATION|ACADEMIC|CERTIFICATIONS?\s*(?:&|AND)?\s*EDUCATION)\b/i },
  ];

  const lines = text.split("\n");
  const sectionStarts: { key: string; index: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    for (const { key, pattern } of headingPatterns) {
      // A section heading is usually a short line (< 60 chars) that matches the pattern
      if (trimmed.length < 60 && pattern.test(trimmed)) {
        sectionStarts.push({ key, index: i });
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
