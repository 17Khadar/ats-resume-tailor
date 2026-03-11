// ============================================================
// Experience Page — manage multiple resume/profile slots.
// Each slot stores a resume variant with label, role hint,
// specialization, tags, notes, and a server-uploaded file.
// ============================================================
"use client";

import { useRef, useState } from "react";
import { usePersistedResumeSlots } from "@/hooks/usePersistedResumeSlots";
import { ROLES } from "@/lib/roles";
import { IS_LOCAL_ONLY } from "@/lib/endpoints";
import * as api from "@/lib/apiClient";
import * as localFiles from "@/lib/localFileStore";
import type { ResumeSlot } from "@/types";

function generateId(): string {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const EMPTY_SLOT: Omit<ResumeSlot, "id"> = {
  label: "",
  roleHint: "",
  specialization: "",
  originalFileName: "",
  fileType: "",
  uploadedAt: "",
  notes: "",
  tags: [],
  uploadId: "",
};

export default function ExperiencePage() {
  const {
    hydrated,
    slots,
    addSlot,
    updateSlot,
    removeSlot,
  } = usePersistedResumeSlots();

  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Add new slot ──
  const handleAddSlot = () => {
    if (slots.length >= 10) return; // reasonable upper bound
    const id = generateId();
    addSlot({ ...EMPTY_SLOT, id });
  };

  // ── Upload file for a slot ──
  const handleFileChange = async (slotId: string, file: File | null) => {
    if (!file) return;
    setUploading(slotId);
    setError(null);
    try {
      if (IS_LOCAL_ONLY) {
        // No backend — store in IndexedDB
        const meta = await localFiles.saveFile(file);
        updateSlot(slotId, {
          originalFileName: file.name,
          fileType: meta.type,
          uploadedAt: meta.storedAt,
          uploadId: meta.id,
        });
      } else {
        const meta = await api.uploadFile(file, "resume");
        updateSlot(slotId, {
          originalFileName: file.name,
          fileType: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          uploadedAt: new Date().toISOString(),
          uploadId: meta.id,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  // ── Remove a slot ──
  const handleRemove = (slot: ResumeSlot) => {
    if (slot.uploadId) {
      if (IS_LOCAL_ONLY) {
        localFiles.deleteFile(slot.uploadId).catch(() => {});
      } else {
        api.deleteUpload(slot.uploadId).catch(() => {});
      }
    }
    removeSlot(slot.id);
  };

  // ── Tag management ──
  const handleAddTag = (slotId: string) => {
    const tag = (tagInput[slotId] ?? "").trim().toLowerCase();
    if (!tag) return;
    const slot = slots.find((s) => s.id === slotId);
    if (!slot || slot.tags.includes(tag)) return;
    updateSlot(slotId, { tags: [...slot.tags, tag] });
    setTagInput((prev) => ({ ...prev, [slotId]: "" }));
  };

  const handleRemoveTag = (slotId: string, tag: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    updateSlot(slotId, { tags: slot.tags.filter((t) => t !== tag) });
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="border-b border-gray-200 bg-white px-4 sm:px-8 py-6">
        <div className="max-w-5xl">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Experience &amp; Resumes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your resume profiles. Each slot stores a resume variant that can be selected
            from any role page during generation. Label, tag, and organize them by role or specialization.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 max-w-5xl space-y-6">
        {/* Slot cards */}
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
          >
            {/* Row 1: label + role hint + specialization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Label *</label>
                <input
                  type="text"
                  value={slot.label}
                  onChange={(e) => updateSlot(slot.id, { label: e.target.value })}
                  placeholder="e.g. Data Engineer - AWS"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role Hint</label>
                <select
                  value={slot.roleHint}
                  onChange={(e) => updateSlot(slot.id, { roleHint: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Any role</option>
                  {ROLES.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Specialization</label>
                <input
                  type="text"
                  value={slot.specialization}
                  onChange={(e) => updateSlot(slot.id, { specialization: e.target.value })}
                  placeholder="e.g. AWS, Azure, Backend, BI"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Row 2: file upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Resume File</label>
              {slot.uploadId && slot.originalFileName ? (
                <div className="border border-green-200 bg-green-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">{slot.originalFileName}</p>
                    {slot.uploadedAt && (
                      <p className="text-xs text-green-700 mt-0.5">
                        Uploaded {new Date(slot.uploadedAt).toLocaleDateString()}
                      </p>
                    )}
                    {uploading === slot.id && (
                      <p className="text-xs text-blue-600 mt-0.5 animate-pulse">Uploading...</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRefs.current[slot.id]?.click()}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRefs.current[slot.id]?.click()}
                  disabled={uploading === slot.id}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {uploading === slot.id ? (
                    <p className="text-sm text-blue-600 animate-pulse">Uploading...</p>
                  ) : (
                    <>
                      <div className="text-2xl mb-1">📄</div>
                      <p className="text-sm font-medium text-gray-700">Click to upload</p>
                      <p className="text-xs text-gray-400 mt-0.5">DOCX files only</p>
                    </>
                  )}
                </button>
              )}
              <input
                ref={(el) => { fileRefs.current[slot.id] = el; }}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => handleFileChange(slot.id, e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>

            {/* Row 3: notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
              <textarea
                value={slot.notes}
                onChange={(e) => updateSlot(slot.id, { notes: e.target.value })}
                placeholder="Optional notes about this resume variant..."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
              />
            </div>

            {/* Row 4: tags */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {slot.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(slot.id, tag)}
                      className="text-blue-400 hover:text-blue-700 cursor-pointer"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput[slot.id] ?? ""}
                  onChange={(e) => setTagInput((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(slot.id); } }}
                  placeholder="Add a tag and press Enter"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(slot.id)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 border border-blue-200 rounded-lg cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Remove button */}
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleRemove(slot)}
                className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
              >
                Remove this resume slot
              </button>
            </div>
          </div>
        ))}

        {/* Add slot button */}
        <button
          type="button"
          onClick={handleAddSlot}
          disabled={slots.length >= 10}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-5 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <p className="text-lg font-semibold text-gray-600">+ Add Resume Slot</p>
          <p className="text-xs text-gray-400 mt-1">
            {slots.length}/10 slots used. Add another resume variant.
          </p>
        </button>

        {/* Info note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Files are stored in your browser and persist across sessions.
            Label each slot clearly so you can easily select the right resume when generating from a role page.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
