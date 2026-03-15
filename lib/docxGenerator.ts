// ============================================================
// DOCX Generator — creates a downloadable tailored resume
// ============================================================

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ExternalHyperlink,
} from "docx";
import type { ATSReport, ContactInfo, ResumeSectionOutput } from "@/types";

// ── Style constants (Calibri 10pt = 20 half-points) ─────────
const FONT = "Calibri";
const SIZE = 20; // 10pt in half-points
const HEADING_SIZE = 24; // 12pt

// ── Helpers ─────────────────────────────────────────────────

/** Creates a plain text paragraph */
function textParagraph(text: string, bold = false): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 240 }, // single spacing
    children: [
      new TextRun({ text, font: FONT, size: SIZE, bold }),
    ],
  });
}

/** Creates a section heading with a bottom border */
function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 60, line: 240 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    children: [
      new TextRun({ text: title.toUpperCase(), font: FONT, size: HEADING_SIZE, bold: true }),
    ],
  });
}

/** Creates a bullet point paragraph */
function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 240 },
    children: [
      new TextRun({ text: `• ${text}`, font: FONT, size: SIZE }),
    ],
  });
}

/** Skill line — bullet + bold category before colon, rest is normal */
function skillParagraph(line: string): Paragraph {
  const colonIndex = line.indexOf(":");
  if (colonIndex > 0) {
    const category = line.substring(0, colonIndex + 1);
    const rest = line.substring(colonIndex + 1);
    return new Paragraph({
      spacing: { before: 0, after: 0, line: 240 },
      indent: { left: 360, hanging: 360 },
      children: [
        new TextRun({ text: "• ", font: FONT, size: SIZE }),
        new TextRun({ text: category, font: FONT, size: SIZE, bold: true }),
        new TextRun({ text: rest, font: FONT, size: SIZE }),
      ],
    });
  }
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 240 },
    indent: { left: 360, hanging: 360 },
    children: [
      new TextRun({ text: `• ${line}`, font: FONT, size: SIZE }),
    ],
  });
}

// ── Main document builder ───────────────────────────────────

export function buildResumeDocument(resume: ResumeSectionOutput, report: ATSReport, contactInfo?: ContactInfo): Document {
  const paragraphs: Paragraph[] = [];

  // ── Contact Header (centered) ──
  if (contactInfo?.name) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          new TextRun({ text: contactInfo.name, font: FONT, size: 28, bold: true }),
        ],
      })
    );
  }
  // Build contact line with LinkedIn as hyperlink if present
  const contactParts: (TextRun | string | ExternalHyperlink)[] = [];
  if (contactInfo?.email) contactParts.push(contactInfo.email);
  if (contactInfo?.phone) contactParts.push(contactInfo.phone);
  if (contactInfo?.linkedin && contactInfo?.linkedinDisplay) {
    const link = contactInfo.linkedin.startsWith("http") ? contactInfo.linkedin : `https://${contactInfo.linkedin}`;
    contactParts.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: contactInfo.linkedinDisplay,
            font: FONT,
            size: SIZE,
            color: "0563C1",
            underline: {},
            style: "Hyperlink",
          }),
        ],
        link,
      })
    );
  }
  if (contactInfo?.location) contactParts.push(contactInfo.location);
  if (contactParts.length > 0) {
    // Interleave with separators
    const children: (TextRun | ExternalHyperlink)[] = [];
    contactParts.forEach((part, idx) => {
      if (idx > 0) children.push(new TextRun({ text: " | ", font: FONT, size: SIZE }));
      if (typeof part === "string") {
        children.push(new TextRun({ text: part, font: FONT, size: SIZE }));
      } else {
        children.push(part);
      }
    });
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60, line: 240 },
        children,
      })
    );
  }

  // ── Summary ──
  paragraphs.push(sectionHeading("Summary"));
  paragraphs.push(textParagraph(resume.summary));

  // ── Skills ──
  paragraphs.push(sectionHeading("Skills"));
  for (const line of resume.skills) {
    paragraphs.push(skillParagraph(line));
  }

  // ── Work Experience ──
  paragraphs.push(sectionHeading("Work Experience"));
  for (const exp of resume.workExperience) {
    // Role + Company + Duration
    const roleLine = [exp.role, exp.company, exp.duration].filter(Boolean).join(" | ");
    paragraphs.push(textParagraph(roleLine, true));

    for (const bullet of exp.bullets) {
      paragraphs.push(bulletParagraph(bullet));
    }

    // Small gap between jobs
    paragraphs.push(new Paragraph({ spacing: { before: 0, after: 60, line: 240 }, children: [] }));
  }

  // ── Education ──
  paragraphs.push(sectionHeading("Education"));
  for (const edu of resume.education) {
    const eduLine = [edu.degree, edu.institution, edu.year].filter(Boolean).join(" | ");
    paragraphs.push(textParagraph(eduLine));
  }

  // ATS Strategy Report is intentionally excluded from the DOCX output.
  // It is only shown in the web UI (ATSReportPanel component).

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 }, // 0.5 inch margins
          },
        },
        children: paragraphs,
      },
    ],
  });
}

/** Serialize the document to a Buffer for download */
export async function generateDocxBuffer(resume: ResumeSectionOutput, report: ATSReport, contactInfo?: ContactInfo): Promise<Buffer> {
  const doc = buildResumeDocument(resume, report, contactInfo);
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
