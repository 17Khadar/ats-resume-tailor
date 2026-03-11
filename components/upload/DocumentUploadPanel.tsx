// ============================================================
// DocumentUploadPanel — multi-category file upload panel.
// Supports resume, experience docs, supporting docs, and JD
// documents. Wired to the server upload API.
// ============================================================
"use client";

import { useRef, useState, type ChangeEvent } from "react";
import * as api from "@/lib/apiClient";
import { IS_LOCAL_ONLY } from "@/lib/endpoints";
import type { UploadCategory } from "@/types";

export interface UploadedDoc {
  file: File;
  category: DocCategory;
  addedAt: string;
  /** Server-side upload ID (set after successful upload) */
  serverId?: string;
}

export type DocCategory = "resume" | "experience" | "supporting" | "jd";

interface CategoryDef {
  key: DocCategory;
  label: string;
  icon: string;
  description: string;
  accept: string;
  multiple: boolean;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "resume",
    label: "Base Resume",
    icon: "📄",
    description: "Your master/base resume document (DOCX or PDF)",
    accept: ".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf",
    multiple: false,
  },
  {
    key: "experience",
    label: "Experience Docs",
    icon: "💼",
    description: "Additional experience, project details, or portfolio docs",
    accept: ".docx,.pdf,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown",
    multiple: true,
  },
  {
    key: "supporting",
    label: "Supporting Docs",
    icon: "📎",
    description: "Certifications, cover letters, or reference materials",
    accept: ".docx,.pdf,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown",
    multiple: true,
  },
  {
    key: "jd",
    label: "Job Description",
    icon: "📋",
    description: "Upload a JD document instead of pasting text",
    accept: ".docx,.pdf,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain",
    multiple: false,
  },
];

interface Props {
  documents: UploadedDoc[];
  onChange: (documents: UploadedDoc[]) => void;
}

export default function DocumentUploadPanel({ documents, onChange }: Props) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (category: CategoryDef, e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const now = new Date().toISOString();
    const newDocs: UploadedDoc[] = Array.from(files).map((file) => ({
      file,
      category: category.key,
      addedAt: now,
    }));

    // Optimistic local update
    let updated: UploadedDoc[];
    if (category.multiple) {
      updated = [...documents, ...newDocs];
    } else {
      const filtered = documents.filter((d) => d.category !== category.key);
      updated = [...filtered, ...newDocs];
    }
    onChange(updated);

    // Upload to server (skip when no backend is available)
    if (!IS_LOCAL_ONLY) {
      setUploading(true);
      try {
        const uploaded = await Promise.all(
          newDocs.map(async (doc) => {
            const meta = await api.uploadFile(doc.file, doc.category as UploadCategory);
            return { ...doc, serverId: meta.id };
          }),
        );
        // Merge server IDs into the list
        const merged = updated.map((d) => {
          const match = uploaded.find(
            (u) => u.file === d.file && u.addedAt === d.addedAt,
          );
          return match ?? d;
        });
        onChange(merged);
      } catch {
        // Files already added locally — server upload failed silently
      } finally {
        setUploading(false);
      }
    }

    // Reset input so same file can be re-selected
    if (fileRefs.current[category.key]) {
      fileRefs.current[category.key]!.value = "";
    }
  };

  const removeDoc = (index: number) => {
    const doc = documents[index];
    // Delete from server if we have a server ID (skip when no backend)
    if (!IS_LOCAL_ONLY && doc?.serverId) {
      api.deleteUpload(doc.serverId).catch(() => {});
    }
    onChange(documents.filter((_, i) => i !== index));
  };

  const docsForCategory = (key: DocCategory) =>
    documents.filter((d) => d.category === key);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Document Uploads</h2>
      <p className="text-sm text-gray-500 mb-5">
        Upload documents instead of pasting text. Supports DOCX, PDF, TXT, and Markdown files.
        {uploading && (
          <span className="ml-2 text-blue-600 animate-pulse">Uploading...</span>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => {
          const catDocs = docsForCategory(cat.key);
          const globalIndex = (doc: UploadedDoc) => documents.indexOf(doc);

          return (
            <div
              key={cat.key}
              className="border border-gray-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{cat.icon}</span>
                <h3 className="text-sm font-semibold text-gray-900">{cat.label}</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">{cat.description}</p>

              {/* Uploaded file list */}
              {catDocs.length > 0 && (
                <div className="space-y-2 mb-3">
                  {catDocs.map((doc) => (
                    <div
                      key={`${doc.category}-${doc.file.name}-${doc.addedAt}`}
                      className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-green-900 truncate">
                          {doc.file.name}
                        </p>
                        <p className="text-[10px] text-green-600">
                          {formatSize(doc.file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDoc(globalIndex(doc))}
                        className="text-red-500 hover:text-red-700 text-xs font-medium ml-2 flex-shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <button
                type="button"
                onClick={() => fileRefs.current[cat.key]?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
              >
                <p className="text-xs font-medium text-gray-600">
                  {catDocs.length > 0 ? (cat.multiple ? "Add more files" : "Replace file") : "Click to upload"}
                </p>
              </button>

              <input
                ref={(el) => { fileRefs.current[cat.key] = el; }}
                type="file"
                accept={cat.accept}
                multiple={cat.multiple}
                onChange={(e) => handleFileChange(cat, e)}
                className="hidden"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
