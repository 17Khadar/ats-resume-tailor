// ============================================================
// Template Definitions — resume template selection config
// ============================================================

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  preview: string;
  isDefault: boolean;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "professional-classic",
    name: "Professional Classic",
    description: "Clean, traditional resume format optimized for ATS parsers. Single column, standard headings, proven layout.",
    preview: "📄",
    isDefault: true,
  },
  {
    id: "modern-ats-safe",
    name: "Modern ATS Safe",
    description: "Contemporary layout with subtle styling. Professional appearance while maintaining full ATS compatibility.",
    preview: "✨",
    isDefault: false,
  },
  {
    id: "minimal-one-page",
    name: "Minimal One-Page",
    description: "Stripped-down, single-page format focusing purely on content. Maximum ATS compatibility with zero formatting risk.",
    preview: "📝",
    isDefault: false,
  },
  {
    id: "technical-specialist",
    name: "Technical Specialist",
    description: "Emphasizes technical skills and certifications. Ideal for engineering, DevOps, and data roles with deep tooling.",
    preview: "🔧",
    isDefault: false,
  },
  {
    id: "compact-executive",
    name: "Compact Executive",
    description: "Concise, leadership-focused layout. Highlights impact metrics, strategic initiatives, and cross-functional experience.",
    preview: "💼",
    isDefault: false,
  },
];

export const DEFAULT_TEMPLATE = TEMPLATES.find((t) => t.isDefault)!;
