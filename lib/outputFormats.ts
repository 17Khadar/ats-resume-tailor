// ============================================================
// Output Format Definitions — document export format config
// ============================================================

export interface OutputFormatConfig {
  id: string;
  label: string;
  extension: string;
  mimeType: string;
  description: string;
  enabled: boolean;
}

export const OUTPUT_FORMATS: OutputFormatConfig[] = [
  {
    id: "docx",
    label: "DOCX",
    extension: ".docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    description: "Microsoft Word — best for editing and most ATS systems",
    enabled: true,
  },
  {
    id: "pdf",
    label: "PDF",
    extension: ".pdf",
    mimeType: "application/pdf",
    description: "PDF — best for final submission when editing is not needed",
    enabled: true,
  },
  {
    id: "txt",
    label: "TXT",
    extension: ".txt",
    mimeType: "text/plain",
    description: "Plain text — maximum compatibility for copy-paste into online forms",
    enabled: true,
  },
  {
    id: "md",
    label: "Markdown",
    extension: ".md",
    mimeType: "text/markdown",
    description: "Markdown — structured text for developer portfolios and GitHub profiles",
    enabled: true,
  },
];

export const DEFAULT_FORMATS = OUTPUT_FORMATS.filter((f) => f.enabled);
