// ============================================================
// JobInputForm — collects JD input from the user
// ============================================================
"use client";

import type { JobInput } from "@/types";

interface Props {
  jobInput: JobInput;
  onChange: (input: JobInput) => void;
  onSubmit: () => void;
  isLoading: boolean;
  hasResumes: boolean;
}

export default function JobInputForm({ jobInput, onChange, onSubmit, isLoading, hasResumes }: Props) {
  const update = (field: keyof JobInput, value: string) => {
    onChange({ ...jobInput, [field]: value });
  };

  const hasAnyInput = !!(
    jobInput.jobId?.trim() ||
    jobInput.companyName?.trim() ||
    jobInput.jdUrl?.trim() ||
    jobInput.jdText?.trim()
  );

  const canSubmit = hasAnyInput && hasResumes && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onSubmit();
  };

  return (
    <section className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Job Description Input</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Job ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job ID (optional)</label>
            <input
              type="text"
              value={jobInput.jobId || ""}
              onChange={(e) => update("jobId", e.target.value)}
              placeholder="e.g. REQ-12345"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name (optional)</label>
            <input
              type="text"
              value={jobInput.companyName || ""}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="e.g. Amazon"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* JD URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">JD URL (optional)</label>
          <input
            type="text"
            value={jobInput.jdUrl || ""}
            onChange={(e) => update("jdUrl", e.target.value)}
            placeholder="https://careers.example.com/job/12345"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Full JD Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full JD Text (recommended for best results)
          </label>
          <textarea
            value={jobInput.jdText || ""}
            onChange={(e) => update("jdText", e.target.value)}
            placeholder="Paste the complete job description here..."
            rows={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
          />
        </div>

        {/* Validation hint */}
        {!hasResumes && (
          <p className="text-sm text-amber-600 font-medium">
            Please upload at least one master resume (AWS or Azure) before generating.
          </p>
        )}
        {!hasAnyInput && (
          <p className="text-sm text-gray-500">
            Fill in at least one field above. Full JD text or JD URL gives the best results.
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-3 rounded-xl text-white font-semibold text-base transition-all
            ${canSubmit
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md cursor-pointer"
              : "bg-gray-300 cursor-not-allowed"
            }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing JD &amp; Tailoring Resume...
            </span>
          ) : (
            "Analyze JD & Tailor Resume"
          )}
        </button>
      </form>
    </section>
  );
}
