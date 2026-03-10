// ============================================================
// PDF Generator — creates a downloadable tailored resume PDF
// ============================================================

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ContactInfo, ResumeSectionOutput } from "@/types";

// ── Layout constants ────────────────────────────────────────
const PAGE_W = 612; // US Letter width (points)
const PAGE_H = 792; // US Letter height (points)
const MARGIN_X = 50;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;
const TEXT_W = PAGE_W - 2 * MARGIN_X;

const FONT_SIZE = 10;
const HEADING_SIZE = 12;
const NAME_SIZE = 16;
const LINE_HEIGHT = 14;
const HEADING_GAP = 6;
const SECTION_GAP = 10;

// ── Text wrapping helper ────────────────────────────────────

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

// ── Main PDF builder ────────────────────────────────────────

export async function generatePdfBuffer(
  resume: ResumeSectionOutput,
  contactInfo?: ContactInfo
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.3, 0.3, 0.3);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN_TOP;

  /** Add a new page if we're running out of space */
  function ensureSpace(needed: number) {
    if (y - needed < MARGIN_BOTTOM) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN_TOP;
    }
  }

  /** Draw a single line of text */
  function drawLine(
    text: string,
    x: number,
    font_: typeof regular,
    size: number,
    color = black
  ) {
    ensureSpace(LINE_HEIGHT);
    page.drawText(text, { x, y, size, font: font_, color });
    y -= LINE_HEIGHT;
  }

  /** Draw centered text */
  function drawCentered(text: string, font_: typeof regular, size: number, color = black) {
    ensureSpace(LINE_HEIGHT + 2);
    const tw = font_.widthOfTextAtSize(text, size);
    const x = (PAGE_W - tw) / 2;
    page.drawText(text, { x, y, size, font: font_, color });
    y -= LINE_HEIGHT + 2;
  }

  /** Draw wrapped paragraph */
  function drawParagraph(
    text: string,
    x: number,
    font_: typeof regular,
    size: number,
    maxWidth: number,
    color = black
  ) {
    const lines = wrapText(text, font_, size, maxWidth);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      page.drawText(line, { x, y, size, font: font_, color });
      y -= LINE_HEIGHT;
    }
  }

  /** Draw a section heading with underline */
  function drawHeading(title: string) {
    ensureSpace(HEADING_SIZE + HEADING_GAP + 4);
    y -= SECTION_GAP;
    page.drawText(title.toUpperCase(), {
      x: MARGIN_X,
      y,
      size: HEADING_SIZE,
      font: bold,
      color: black,
    });
    y -= 3;
    // Draw underline
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: PAGE_W - MARGIN_X, y },
      thickness: 0.5,
      color: black,
    });
    y -= HEADING_GAP;
  }

  // ── Contact Header ──
  if (contactInfo?.name) {
    drawCentered(contactInfo.name, bold, NAME_SIZE);
  }
  const contactParts = [
    contactInfo?.email,
    contactInfo?.phone,
    contactInfo?.linkedin,
    contactInfo?.location,
  ].filter(Boolean);
  if (contactParts.length > 0) {
    drawCentered(contactParts.join(" | "), regular, FONT_SIZE - 1, gray);
  }

  // ── Summary ──
  drawHeading("Summary");
  drawParagraph(resume.summary, MARGIN_X, regular, FONT_SIZE, TEXT_W);

  // ── Skills ──
  drawHeading("Skills");
  for (const line of resume.skills) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const category = line.substring(0, colonIdx + 1);
      const rest = line.substring(colonIdx + 1);
      // Draw "• Category:" in bold, rest in regular
      const bulletText = "• ";
      const bulletW = regular.widthOfTextAtSize(bulletText, FONT_SIZE);
      const catW = bold.widthOfTextAtSize(category, FONT_SIZE);

      // Wrap the rest portion
      const restLines = wrapText(rest.trim(), regular, FONT_SIZE, TEXT_W - bulletW - catW - 10);

      ensureSpace(LINE_HEIGHT);
      page.drawText(bulletText, { x: MARGIN_X + 10, y, size: FONT_SIZE, font: regular, color: black });
      page.drawText(category, { x: MARGIN_X + 10 + bulletW, y, size: FONT_SIZE, font: bold, color: black });
      if (restLines.length > 0) {
        page.drawText(restLines[0], {
          x: MARGIN_X + 10 + bulletW + catW + 2,
          y,
          size: FONT_SIZE,
          font: regular,
          color: black,
        });
      }
      y -= LINE_HEIGHT;

      // Continuation lines
      for (let i = 1; i < restLines.length; i++) {
        ensureSpace(LINE_HEIGHT);
        page.drawText(restLines[i], {
          x: MARGIN_X + 10 + bulletW + catW + 2,
          y,
          size: FONT_SIZE,
          font: regular,
          color: black,
        });
        y -= LINE_HEIGHT;
      }
    } else {
      drawParagraph(`• ${line}`, MARGIN_X + 10, regular, FONT_SIZE, TEXT_W - 10);
    }
  }

  // ── Work Experience ──
  drawHeading("Work Experience");
  for (const exp of resume.workExperience) {
    const roleLine = [exp.role, exp.company, exp.duration].filter(Boolean).join(" | ");
    ensureSpace(LINE_HEIGHT * 2);
    drawParagraph(roleLine, MARGIN_X, bold, FONT_SIZE, TEXT_W);

    for (const bullet of exp.bullets) {
      drawParagraph(`• ${bullet}`, MARGIN_X + 10, regular, FONT_SIZE, TEXT_W - 10);
    }
    y -= 4; // small gap between jobs
  }

  // ── Education ──
  drawHeading("Education");
  for (const edu of resume.education) {
    const eduLine = [edu.degree, edu.institution, edu.year].filter(Boolean).join(" | ");
    drawParagraph(eduLine, MARGIN_X, regular, FONT_SIZE, TEXT_W);
  }

  return await doc.save();
}
