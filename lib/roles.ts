// ============================================================
// Role Definitions — sidebar navigation + role-specific config
// ============================================================

export interface RoleConfig {
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  resumeLabel: string;
  introText: string;
  customInstructionPlaceholder: string;
  defaultSuggestions: {
    sampleJobTitles: string[];
    sampleSkills: string[];
    helpText: string;
  };
}

export const ROLES: RoleConfig[] = [
  {
    slug: "software-developer",
    label: "Software Developer",
    shortLabel: "SWE",
    description: "Full-stack, backend, and frontend development roles",
    icon: "💻",
    resumeLabel: "Select your Software Developer resume",
    introText: "Choose a base resume, paste a software engineering job description, and generate an ATS-optimized tailored resume for development roles.",
    customInstructionPlaceholder: "Example: Focus on backend APIs, application development, frameworks, and coding depth where truthful.",
    defaultSuggestions: {
      sampleJobTitles: ["Software Engineer", "Full Stack Developer", "Backend Engineer"],
      sampleSkills: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL"],
      helpText: "Paste a software engineering job description to tailor your resume for development roles.",
    },
  },
  {
    slug: "data-engineer",
    label: "Data Engineer",
    shortLabel: "DE",
    description: "Data pipeline, ETL, and data infrastructure roles",
    icon: "🔧",
    resumeLabel: "Select your Data Engineer resume",
    introText: "Choose a base resume, paste a data engineering job description, and generate an ATS-optimized tailored resume for data infrastructure roles.",
    customInstructionPlaceholder: "Example: Emphasize ETL, SQL, cloud pipelines, Spark, warehousing, and workflow orchestration where truthful.",
    defaultSuggestions: {
      sampleJobTitles: ["Data Engineer", "Senior Data Engineer", "ETL Developer"],
      sampleSkills: ["Python", "SQL", "Spark", "Airflow", "AWS Glue", "Kafka"],
      helpText: "Paste a data engineering job description to optimize your resume for data infrastructure roles.",
    },
  },
  {
    slug: "data-analyst",
    label: "Data Analyst",
    shortLabel: "DA",
    description: "Data analysis, visualization, and reporting roles",
    icon: "📊",
    resumeLabel: "Select your Data Analyst resume",
    introText: "Choose a base resume, paste a data analyst job description, and generate an ATS-optimized tailored resume for analytics and reporting roles.",
    customInstructionPlaceholder: "Example: Focus on SQL, reporting, dashboards, Power BI/Tableau, Excel, and stakeholder insights where truthful.",
    defaultSuggestions: {
      sampleJobTitles: ["Data Analyst", "Business Intelligence Analyst", "Analytics Engineer"],
      sampleSkills: ["SQL", "Python", "Tableau", "Power BI", "Excel", "Statistics"],
      helpText: "Paste a data analyst job description to tailor your resume for analytics and reporting roles.",
    },
  },
  {
    slug: "business-analyst",
    label: "Business Analyst",
    shortLabel: "BA",
    description: "Business analysis, requirements gathering, and process improvement roles",
    icon: "📋",
    resumeLabel: "Select your Business Analyst resume",
    introText: "Choose a base resume, paste a business analyst job description, and generate an ATS-optimized tailored resume for BA roles.",
    customInstructionPlaceholder: "Example: Emphasize stakeholder communication, requirements gathering, JIRA, Agile, and process improvement where truthful.",
    defaultSuggestions: {
      sampleJobTitles: ["Business Analyst", "Senior Business Analyst", "Systems Analyst"],
      sampleSkills: ["SQL", "JIRA", "Agile", "Requirements Analysis", "Stakeholder Management", "Process Mapping"],
      helpText: "Paste a business analyst job description to optimize your resume for BA roles.",
    },
  },
  {
    slug: "qa-engineer",
    label: "QA Engineer",
    shortLabel: "QA",
    description: "Quality assurance, test automation, and SDET roles",
    icon: "🧪",
    resumeLabel: "Select your QA Engineer resume",
    introText: "Choose a base resume, paste a QA engineering job description, and generate an ATS-optimized tailored resume for testing and quality roles.",
    customInstructionPlaceholder: "Example: Focus on test automation, Selenium, CI/CD, API testing, and QA frameworks where truthful.",
    defaultSuggestions: {
      sampleJobTitles: ["QA Engineer", "SDET", "Test Automation Engineer"],
      sampleSkills: ["Selenium", "Cypress", "Jest", "Python", "CI/CD", "API Testing"],
      helpText: "Paste a QA engineering job description to tailor your resume for testing and quality roles.",
    },
  },
  {
    slug: "devops-engineer",
    label: "DevOps Engineer",
    shortLabel: "DevOps",
    description: "DevOps, SRE, cloud infrastructure, and CI/CD roles",
    icon: "⚙️",
    resumeLabel: "Select your DevOps Engineer resume",
    introText: "Choose a base resume, paste a DevOps job description, and generate an ATS-optimized tailored resume for infrastructure and operations roles.",
    customInstructionPlaceholder: "Example: Emphasize Terraform, Docker, Kubernetes, CI/CD, cloud infrastructure, and monitoring where truthful.",
    defaultSuggestions: {
      sampleJobTitles: ["DevOps Engineer", "Site Reliability Engineer", "Platform Engineer"],
      sampleSkills: ["AWS", "Terraform", "Docker", "Kubernetes", "CI/CD", "Linux"],
      helpText: "Paste a DevOps job description to optimize your resume for infrastructure and operations roles.",
    },
  },
];

export const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.slug, r]));
