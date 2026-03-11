// ============================================================
// API Client — typed fetch wrapper for the ATS Resume Server.
// All responses follow { success: true, data: T } | { success: false, error: string }.
// ============================================================

import { ENDPOINTS } from "./endpoints";
import type {
  AppSettings,
  ProfileData,
  UploadedDocMeta,
  UploadCategory,
  GenerationInput,
  GenerationJob,
  EmailSendRequest,
} from "@/types";

// ── Helpers ─────────────────────────────────────────────────

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: string;
  details?: string;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error((json as ApiError).error);
  }
  return (json as ApiSuccess<T>).data;
}

// ── Settings ────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  return request<AppSettings>(ENDPOINTS.settings);
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  return request<AppSettings>(ENDPOINTS.settings, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

// ── Profile ─────────────────────────────────────────────────

export async function getProfile(): Promise<ProfileData> {
  return request<ProfileData>(ENDPOINTS.profile);
}

export async function addResume(meta: {
  type: "aws" | "azure";
  originalName: string;
  storedName: string;
  size: number;
  mimeType: string;
}): Promise<ProfileData> {
  return request<ProfileData>(ENDPOINTS.profileResumes, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
}

export async function removeResume(id: string): Promise<ProfileData> {
  return request<ProfileData>(ENDPOINTS.profileResumeById(id), {
    method: "DELETE",
  });
}

// ── Uploads ─────────────────────────────────────────────────

export async function uploadFile(
  file: File,
  category: UploadCategory,
): Promise<UploadedDocMeta> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  return request<UploadedDocMeta>(ENDPOINTS.uploads, {
    method: "POST",
    body: formData,
  });
}

export async function listUploads(category?: UploadCategory): Promise<UploadedDocMeta[]> {
  const url = category
    ? `${ENDPOINTS.uploads}?category=${encodeURIComponent(category)}`
    : ENDPOINTS.uploads;
  return request<UploadedDocMeta[]>(url);
}

export async function getUpload(id: string): Promise<UploadedDocMeta> {
  return request<UploadedDocMeta>(ENDPOINTS.uploadById(id));
}

export async function deleteUpload(id: string): Promise<{ deleted: string }> {
  return request<{ deleted: string }>(ENDPOINTS.uploadById(id), {
    method: "DELETE",
  });
}

// ── Generation ──────────────────────────────────────────────

export async function startGeneration(
  input: GenerationInput,
): Promise<{ jobId: string }> {
  return request<{ jobId: string }>(ENDPOINTS.resumeGenerate, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function getJobStatus(jobId: string): Promise<GenerationJob> {
  return request<GenerationJob>(ENDPOINTS.resumeStatus(jobId));
}

// ── Email ───────────────────────────────────────────────────

export async function sendEmail(
  req: EmailSendRequest,
): Promise<{ sent: boolean; message?: string }> {
  return request<{ sent: boolean; message?: string }>(ENDPOINTS.emailSend, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}
