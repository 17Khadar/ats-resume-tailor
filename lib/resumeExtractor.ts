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
  const contactInfo = extractContactInfo(rawText);

  return { rawText, contactInfo, sections };
}

/**
 * Heuristic section splitter — identifies SUMMARY, SKILLS,
 * WORK EXPERIENCE, EDUCATION headings in the extracted text.
 */
function splitIntoSections(text: string): ExtractedMasterResume["sections"] {
  // More flexible heading patterns: allow dashes, slashes, extra spaces, and alternate names
  const headingPatterns: { key: keyof ExtractedMasterResume["sections"]; pattern: RegExp }[] = [
    {
      key: "summary",
      pattern: /\b(PROFESSIONAL[\s\-\/]+SUMMARY|EXECUTIVE[\s\-\/]+SUMMARY|CAREER[\s\-\/]+SUMMARY|SUMMARY[\s\-\/]+OF[\s\-\/]+QUALIFICATIONS|SUMMARY|PROFILE|OBJECTIVE)\b/i,
    },
    {
      key: "skills",
      pattern: /\b(TECHNICAL[\s\-\/]+SKILLS|KEY[\s\-\/]+SKILLS|PROFESSIONAL[\s\-\/]+SKILLS|RELEVANT[\s\-\/]+SKILLS|SKILLS[\s\-\/]+(?:&|AND)[\s\-\/]+\w+|SKILLS[\s\-\/]+SUMMARY|SKILL[\s\-\/]*SET|SKILLS|CORE[\s\-\/]+COMPETENCIES|KEY[\s\-\/]+COMPETENCIES|COMPETENCIES|TECHNICAL[\s\-\/]+PROFICIENCIES|PROFICIENCIES|TECHNICAL[\s\-\/]+EXPERTISE|AREAS[\s\-\/]+OF[\s\-\/]+EXPERTISE|TOOLS[\s\-\/]+(?:&|AND)[\s\-\/]+TECHNOLOGIES|TECHNOLOGIES|ADDITIONAL[\s\-\/]+TECHNOLOGIES|ADDITIONAL[\s\-\/]+SKILLS)\b/i,
    },
    {
      key: "workExperience",
      pattern: /\b(WORK[\s\-\/]+EXPERIENCE|PROFESSIONAL[\s\-\/]+EXPERIENCE|RELEVANT[\s\-\/]+EXPERIENCE|CAREER[\s\-\/]+HISTORY|EXPERIENCE|EMPLOYMENT[\s\-\/]+HISTORY|EMPLOYMENT|PROJECT[\s\-\/]+EXPERIENCE|PROJECTS|CONTRACT[\s\-\/]+HISTORY|WORK[\s\-\/]+HISTORY)\b/i,
    },
    {
      key: "education",
      pattern: /\b(EDUCATION[\s\-\/]+(?:&|AND)[\s\-\/]+CERTIFICATIONS?|CERTIFICATIONS?[\s\-\/]*(?:&|AND)?[\s\-\/]*EDUCATION|EDUCATION|ACADEMIC|CERTIFICATIONS?|DEGREES|QUALIFICATIONS)\b/i,
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

  // Fallback: if no work experience section found, try to heuristically extract job history
  if (!sections.workExperience) {
    // Heuristic: look for clusters of lines with years, company/role patterns, or bullet points
    const expLines: string[] = [];
    let inBlock = false, block: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      // Look for lines with years (e.g., 2020, 2019-2022), company/role, or bullets
      if (/\b(19|20)\d{2}\b/.test(t) || /\b(Present|Current)\b/i.test(t) || /^[-•\u2022]/.test(t)) {
        inBlock = true;
        block.push(lines[i]);
      } else if (inBlock && t === "") {
        // End of a block
        if (block.length > 2) expLines.push(...block, "");
        block = [];
        inBlock = false;
      } else if (inBlock) {
        block.push(lines[i]);
      }
    }
    if (block.length > 2) expLines.push(...block);
    if (expLines.length > 0) {
      sections.workExperience = expLines.join("\n").trim();
    }
  }

  // Fallback: if no skills section was found, try to detect skill-like lines from the raw text
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
 * Parse contact/identity information from the resume header area.
 *
 * Strategy: The header is the text before the first recognised section
 * heading (SUMMARY, SKILLS, EXPERIENCE, EDUCATION). We scan those
 * lines for common patterns: email, phone, LinkedIn URL, and treat the
 * first non-empty short line as the candidate name. Location is
 * detected via common patterns like "City, ST" or "Open to Relocate".
 */
function extractContactInfo(rawText: string): ContactInfo {
  const contact: ContactInfo = {
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    location: "",
    linkedinDisplay: "", // for rendering clean LinkedIn text
  };

  // Normalise non-ASCII chars
  const normalised = rawText
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u00A0]/g, " ");
  const lines = normalised.split("\n");

  // Find the first section heading to limit our search to the header
  const sectionPattern =
    /\b(PROFESSIONAL\s+SUMMARY|EXECUTIVE\s+SUMMARY|CAREER\s+SUMMARY|SUMMARY\s+OF\s+QUALIFICATIONS|SUMMARY|PROFILE|OBJECTIVE|TECHNICAL\s+SKILLS|KEY\s+SKILLS|PROFESSIONAL\s+SKILLS|SKILLS|CORE\s+COMPETENCIES|COMPETENCIES|WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|RELEVANT\s+EXPERIENCE|EXPERIENCE|EMPLOYMENT|EDUCATION|CERTIFICATIONS?)\b/i;

  let headerEndIndex = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0 && trimmed.length < 80 && sectionPattern.test(trimmed)) {
      headerEndIndex = i;
      break;
    }
  }

  const headerLines = lines.slice(0, headerEndIndex);

  // Patterns
  const emailRe = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  const phoneRe = /(?:\+?\d[\d\s\-().]{7,}\d)/;
  const linkedinRe = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[\w\/-]+/i;
  const locationRe =
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})\b|(?:open\s+to\s+relocat)/i;

  for (const line of headerLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Email
    if (!contact.email) {
      const emailMatch = trimmed.match(emailRe);
      if (emailMatch) contact.email = emailMatch[0];
    }

    // Phone
    if (!contact.phone) {
      const phoneMatch = trimmed.match(phoneRe);
      if (phoneMatch) {
        const cleaned = phoneMatch[0].trim();
        // Avoid matching years like "2020" — require 7+ digits
        if (cleaned.replace(/\D/g, "").length >= 7) {
          contact.phone = cleaned;
        }
      }
    }

    // LinkedIn
    if (!contact.linkedin) {
      const linkedinMatch = trimmed.match(linkedinRe);
      if (linkedinMatch) {
        contact.linkedin = linkedinMatch[0];
        contact.linkedinDisplay = "LinkedIn";
      }
    }

    // Location — "City, ST" or relocation text
    if (!contact.location) {
      const locMatch = trimmed.match(locationRe);
      if (locMatch) {
        // Use the whole line if it's short (likely a location line)
        contact.location = trimmed.length < 80 ? trimmed : (locMatch[1] || locMatch[0]);
      }
    }
  }

  // Name — first non-empty line that isn't an email/phone/URL/location
  for (const line of headerLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 60) continue;
    // Skip lines that are clearly contact details
    if (emailRe.test(trimmed)) continue;
    if (linkedinRe.test(trimmed)) continue;
    if (/^[\d+(\s\-).]+$/.test(trimmed)) continue; // pure phone line
    if (locationRe.test(trimmed) && !(/^[A-Z][a-z]+ [A-Z][a-z]+/.test(trimmed) && trimmed.split(/\s+/).length <= 4)) continue;
    // Skip lines with common non-name patterns
    if (/^(http|www\.|@|phone|email|address)/i.test(trimmed)) continue;
    // Likely the name — a short line of mainly letters
    if (/^[A-Za-z\s.',-]+$/.test(trimmed) && trimmed.split(/\s+/).length >= 2) {
      contact.name = trimmed;
      break;
    }
    // Even a single word could be a name at the very top
    if (/^[A-Za-z.']+$/.test(trimmed) && headerLines.indexOf(line) === 0) {
      contact.name = trimmed;
      break;
    }
  }

  // If LinkedIn found but no display text, set default
  if (contact.linkedin && !contact.linkedinDisplay) {
    contact.linkedinDisplay = "LinkedIn";
  }
  return contact;
}

/**
 * Merge two ContactInfo objects. Values from `override` take priority
 * when they are non-empty. Useful for letting user-configured Settings
 * contact info supplement or replace extracted values.
 */
export function mergeContactInfo(
  extracted: ContactInfo,
  override: Partial<ContactInfo>,
): ContactInfo {
  // Deduplicate: if override and extracted are the same, only use one
  const clean = (val: string | undefined) => (val ? val.trim() : "");
  const dedup = (a: string, b: string) => (a && a === b ? a : a || b);
  return {
    name: dedup(clean(override.name), clean(extracted.name)),
    email: dedup(clean(override.email), clean(extracted.email)),
    phone: dedup(clean(override.phone), clean(extracted.phone)),
    linkedin: dedup(clean(override.linkedin), clean(extracted.linkedin)),
    location: dedup(clean(override.location), clean(extracted.location)),
  };
}
