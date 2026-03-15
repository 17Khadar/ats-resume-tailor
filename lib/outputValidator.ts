// ============================================================
// Output Validator — pre-output quality gate for tailored resumes
// ============================================================
import type { ResumeSectionOutput, ContactInfo } from "@/types";

export interface OutputValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  autoCorrected: boolean;
  correctedResume?: ResumeSectionOutput;
}

/**
 * Validate the final resume output before display or file generation.
 * Applies all required quality checks and can auto-correct some issues.
 */
export function validateResumeOutput(
  resume: ResumeSectionOutput,
  contact: ContactInfo
): OutputValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let autoCorrected = false;
  let correctedResume: ResumeSectionOutput | undefined = undefined;

  // 1. Work experience section must be non-empty if experience exists in source
  if (!resume.workExperience || resume.workExperience.length === 0 || resume.workExperience.every(e => !e.role && !e.company && (!e.bullets || e.bullets.length === 0))) {
    errors.push("Work experience section is empty or missing.");
  }

  // 2. Header/contact line must be cleanly formatted
  if (!contact.name || !contact.email || !contact.phone) {
    errors.push("Header/contact line is missing required fields (name, email, phone).");
  }
  if (contact.linkedin && (!contact.linkedinDisplay || !/^https?:\/\//.test(contact.linkedin))) {
    warnings.push("LinkedIn is present but not properly formatted as a hyperlink.");
  }

  // 3. LinkedIn must be rendered as hyperlink text, not raw URL
  if (contact.linkedin && contact.linkedinDisplay && contact.linkedinDisplay.match(/linkedin/i) && contact.linkedin.match(/^https?:\/\//)) {
    // OK
  } else if (contact.linkedin) {
    warnings.push("LinkedIn is not rendered as hyperlink text.");
  }

  // 4. "Additional Technologies" and similar sections must only contain valid skills
  const additionalTech = resume.skills.find(s => s.toLowerCase().startsWith("additional technologies:"));
  if (additionalTech) {
    const items = additionalTech.split(":")[1]?.split(",").map(i => i.trim()).filter(Boolean) || [];
    for (const item of items) {
      if (!/^[A-Za-z0-9#.+\-/ ]{2,40}$/.test(item)) {
        errors.push(`Invalid entry in Additional Technologies: ${item}`);
      }
    }
  }

  // 5. No obvious raw JD requirement sentences in resume sections
  const allText = [resume.summary, ...resume.skills, ...resume.workExperience.flatMap(e => e.bullets)].join(" ");
  if (/willing to|work on-site|nice to have|interest in|privacy|security|handling sensitive data|job condition|requirement|must have|should have|responsible for|open to|compliance|legal|sentence|statement|location requirement|employer preference|soft requirement|relocate|on-site|remote|hybrid|permanent|contract|visa|authorization|eligible|background check|travel|flexible|benefit|salary|compensation|bonus|equity|stock|401k|insurance|pto|leave|holiday|policy|statement|sentence|fragment/i.test(allText)) {
    warnings.push("Obvious raw JD requirement or condition sentence detected in resume output.");
  }

  // 6. No malformed concatenated contact text
  if (contact.name && (contact.name.match(/[|,]{2,}/) || contact.name.length > 80)) {
    errors.push("Malformed or concatenated contact name detected.");
  }

  // 7. Output did not invent data not present in the source profile (cannot fully check here, but warn if placeholders remain)
  if (allText.includes("[X%]") || allText.includes("[N]") || allText.includes("[$M]")) {
    warnings.push("Placeholder text remains in output (e.g., [X%], [N], [$M]).");
  }

  // 8. Ensure output did not invent data not present in the source profile unless allowed
  // (This is a soft check; actual enforcement would require source resume context)

  // Auto-correct: If only warnings, allow output. If errors, block or attempt fallback.
  if (errors.length === 0) {
    return { valid: true, errors, warnings, autoCorrected, correctedResume: resume };
  } else {
    // Attempt fallback: remove invalid Additional Technologies entries
    if (errors.some(e => e.startsWith("Invalid entry in Additional Technologies")) && additionalTech) {
      const validItems = additionalTech.split(":")[1]?.split(",").map(i => i.trim()).filter(i => /^[A-Za-z0-9#.+\-/ ]{2,40}$/.test(i));
      const newSkills = resume.skills.map(s => s === additionalTech ? `Additional Technologies: ${validItems.join(", ")}` : s);
      correctedResume = { ...resume, skills: newSkills };
      autoCorrected = true;
      return { valid: true, errors: [], warnings: [...warnings, "Auto-corrected invalid Additional Technologies entries."], autoCorrected, correctedResume };
    }
    // Otherwise, block output
    return { valid: false, errors, warnings, autoCorrected };
  }
}
