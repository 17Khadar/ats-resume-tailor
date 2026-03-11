// ============================================================
// Server API Endpoint Definitions
// ============================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** True when no explicit API URL is configured (i.e. no backend deployed). */
export const IS_LOCAL_ONLY =
  typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_URL;

export const ENDPOINTS = {
  health: `${BASE_URL}/api/health`,

  // Settings
  settings: `${BASE_URL}/api/settings`,

  // Profile
  profile: `${BASE_URL}/api/profile`,
  profileResumes: `${BASE_URL}/api/profile/resumes`,
  profileResumeById: (id: string) => `${BASE_URL}/api/profile/resumes/${encodeURIComponent(id)}`,

  // Uploads
  uploads: `${BASE_URL}/api/uploads`,
  uploadById: (id: string) => `${BASE_URL}/api/uploads/${encodeURIComponent(id)}`,

  // JD Resolution
  jdResolve: `${BASE_URL}/api/jd/resolve`,

  // Resume Generation
  resumeGenerate: `${BASE_URL}/api/resume/generate`,
  resumeStatus: (jobId: string) => `${BASE_URL}/api/resume/status/${encodeURIComponent(jobId)}`,

  // Email
  emailSend: `${BASE_URL}/api/email/send`,
} as const;
