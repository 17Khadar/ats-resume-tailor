// ============================================================
// RoleWorkspaceShell — reusable shell wrapping the full
// generation workflow with role-specific branding/suggestions.
// Uses resume slot selection, custom instructions, and
// server generation API with progress polling.
// ============================================================
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  JobInput,
  TailorResumeResponse,
  GenerationJob,
  GeneratedFile,
} from "@/types";
import type { RoleConfig } from "@/lib/roles";
import type { ProgressStep } from "@/components/progress/GenerationProgress";
import { usePersistedResumeSlots } from "@/hooks/usePersistedResumeSlots";
import { usePersistedSettings } from "@/hooks/usePersistedSettings";
import * as api from "@/lib/apiClient";
import { IS_LOCAL_ONLY } from "@/lib/endpoints";
import { getFile } from "@/lib/localFileStore";
import ResumeSlotSelector from "@/components/workspace/ResumeSlotSelector";
import CustomInstructionsBox from "@/components/workspace/CustomInstructionsBox";
import JobInputForm from "@/components/JobInputForm";
import ResultsPanel from "@/components/ResultsPanel";
import GenerationProgress from "@/components/progress/GenerationProgress";
import TemplateSelector from "@/components/forms/TemplateSelector";
import FormatSelector from "@/components/forms/FormatSelector";
import ErrorAlert from "@/components/ErrorAlert";

/** Map server step ID → GenerationProgress display step */
function toDisplayStep(job: GenerationJob): ProgressStep {
  if (job.status === "completed") return "complete";
  if (job.status === "failed") return "error";
  if (job.currentStepId) return job.currentStepId as ProgressStep;
  return "idle";
}

interface Props {
  role: RoleConfig;
}

export default function RoleWorkspaceShell({ role }: Props) {
  // Resume slot selection
  const {
    slots,
    getSlotsForRole,
    getSettings: getRoleSettings,
    getSelectedSlot,
    updateRoleSettings,
  } = usePersistedResumeSlots();

  // Per-role settings
  const roleSettings = getRoleSettings(role.slug);
  const selectedSlotId = roleSettings.selectedResumeSlotId;
  const customInstructions = roleSettings.customInstructions;

  // Custom instructions: local draft + submitted state
  const [instructionsDraft, setInstructionsDraft] = useState(customInstructions);
  const [instructionsSubmitted, setInstructionsSubmitted] = useState(false);

  // Template & format: use per-role if set, else fall back to global
  const globalSettings = usePersistedSettings();
  const template = roleSettings.preferredTemplate || globalSettings.preferredTemplate;
  const formats = roleSettings.preferredFormats.length > 0
    ? roleSettings.preferredFormats
    : globalSettings.preferredFormats;

  // Slots for this role
  const roleSlots = getSlotsForRole(role.slug);
  const selectedSlot = getSelectedSlot(role.slug);
  const hasResume = !!selectedSlot?.uploadId;

  // Job input form state
  const [jobInput, setJobInput] = useState<JobInput>({});

  // Processing state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();

  // Server generation state
  const [progressStep, setProgressStep] = useState<ProgressStep>("idle");
  const [serverFiles, setServerFiles] = useState<GeneratedFile[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results (same shape as legacy flow)
  const [result, setResult] = useState<TailorResumeResponse | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Server generation pipeline ──
  const handleSubmit = async () => {
    if (!selectedSlot?.uploadId) return;

    setError(null);
    setErrorDetails(undefined);
    setResult(null);
    setServerFiles([]);
    setProgressStep("idle");
    setIsLoading(true);

    try {
      if (IS_LOCAL_ONLY) {
        // ── Client-only path: call Next.js API route directly ──
        setProgressStep("parsing-jd");

        // Retrieve the file from IndexedDB
        const stored = await getFile(selectedSlot.uploadId);
        if (!stored) {
          setError("Resume file not found. Please re-upload on the Experience page.");
          setIsLoading(false);
          return;
        }

        const file = new File([stored.data], stored.name, { type: stored.type });
        const specLower = (selectedSlot.specialization ?? "").toLowerCase();
        const isAzure = specLower.includes("azure");

        const formData = new FormData();
        if (jobInput.jobId) formData.append("jobId", jobInput.jobId);
        if (jobInput.companyName) formData.append("companyName", jobInput.companyName);
        if (jobInput.jdUrl) formData.append("jdUrl", jobInput.jdUrl);
        if (jobInput.jdText) formData.append("jdText", jobInput.jdText);
        if (instructionsSubmitted && instructionsDraft.trim()) {
          formData.append("customInstructions", instructionsDraft.trim());
        }
        // Send user-configured contact info so the API can merge with extracted values
        const settingsContact = globalSettings.contact;
        if (settingsContact && Object.values(settingsContact).some((v) => v?.trim())) {
          formData.append("contactOverride", JSON.stringify(settingsContact));
        }
        formData.append(isAzure ? "azureMaster" : "awsMaster", file);

        setProgressStep("tailoring" as ProgressStep);

        const res = await fetch("/api/tailor-resume", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "Generation failed.");
          setIsLoading(false);
          return;
        }

        setProgressStep("complete");
        setResult({
          success: true,
          parsedJD: data.parsedJD,
          selectedMaster: data.selectedMaster,
          cloudDetection: data.cloudDetection,
          resume: data.resume,
          report: data.report,
          contactInfo: data.contactInfo,
        });

        // Clear custom instructions after successful generation
        setInstructionsDraft("");
        setInstructionsSubmitted(false);
        updateRoleSettings(role.slug, { customInstructions: "" });
        setIsLoading(false);
      } else {
        // ── Backend path: start job + poll for status ──
        const specLower = (selectedSlot.specialization ?? "").toLowerCase();
        const isAzure = specLower.includes("azure");

        const { jobId } = await api.startGeneration({
          jobInput,
          awsMasterUploadId: isAzure ? undefined : selectedSlot.uploadId,
          azureMasterUploadId: isAzure ? selectedSlot.uploadId : undefined,
          awsMasterUploaded: !isAzure,
          azureMasterUploaded: isAzure,
          preferredTemplate: template,
          preferredFormats: formats,
          customInstructions: instructionsSubmitted ? instructionsDraft.trim() : undefined,
        });

        setProgressStep("parsing-jd");

        // Poll for status
        pollRef.current = setInterval(async () => {
          try {
            const job = await api.getJobStatus(jobId);
            setProgressStep(toDisplayStep(job));

            if (job.status === "completed" && job.result) {
              stopPolling();
              setServerFiles(job.result.generatedFiles ?? []);
              setResult({
                success: true,
                parsedJD: job.result.parsedJD,
                selectedMaster: job.result.selectedMaster,
                cloudDetection: job.result.cloudDetection,
                resume: job.result.resume,
                report: job.result.report,
                contactInfo: job.result.contactInfo,
              });
              // Clear custom instructions after successful generation
              setInstructionsDraft("");
              setInstructionsSubmitted(false);
              updateRoleSettings(role.slug, { customInstructions: "" });
              setIsLoading(false);
            } else if (job.status === "failed") {
              stopPolling();
              setError(job.error || "Generation failed.");
              setIsLoading(false);
            }
          } catch {
            stopPolling();
            setError("Lost connection to server while checking progress.");
            setIsLoading(false);
          }
        }, 1500);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error. Please check your connection and try again.",
      );
      setIsLoading(false);
    }
  };

  const downloadFile = (file: GeneratedFile) => {
    const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 w-full">
        {/* ── Role header ── */}
        <div className="border-b border-gray-200 bg-white px-4 sm:px-8 py-6">
          <div className="max-w-5xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">{role.icon}</span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{role.label}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>
              </div>
            </div>
            {role.introText && (
              <p className="text-sm text-gray-600 mt-3 max-w-3xl">{role.introText}</p>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
          {/* ── Role-specific guidance ── */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-sm text-blue-800 font-medium mb-3">
              {role.defaultSuggestions.helpText}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">
                  Sample Job Titles
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {role.defaultSuggestions.sampleJobTitles.map((t) => (
                    <span
                      key={t}
                      className="inline-block bg-white/80 border border-blue-200 text-blue-800 text-xs px-2.5 py-1 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">
                  Key Skills to Highlight
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {role.defaultSuggestions.sampleSkills.map((s) => (
                    <span
                      key={s}
                      className="inline-block bg-white/80 border border-blue-200 text-blue-800 text-xs px-2.5 py-1 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 1. Resume Slot Selection ── */}
          <ResumeSlotSelector
            label={role.resumeLabel}
            slots={roleSlots}
            allSlots={slots}
            selectedSlotId={selectedSlotId}
            onSelect={(id) => updateRoleSettings(role.slug, { selectedResumeSlotId: id })}
          />

          {/* ── 2. Job Description Input ── */}
          <JobInputForm
            jobInput={jobInput}
            onChange={setJobInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            hasResumes={hasResume}
          />

          {/* ── 3. Custom Instructions ── */}
          <CustomInstructionsBox
            value={instructionsDraft}
            onChange={(v) => {
              setInstructionsDraft(v);
              setInstructionsSubmitted(false);
              updateRoleSettings(role.slug, { customInstructions: v });
            }}
            onSubmit={() => setInstructionsSubmitted(true)}
            submitted={instructionsSubmitted}
            placeholder={role.customInstructionPlaceholder}
          />

          {/* ── 4. Template Selection ── */}
          <TemplateSelector
            selected={template}
            onChange={(id) => updateRoleSettings(role.slug, { preferredTemplate: id })}
          />

          {/* ── 5. Output Format Selection ── */}
          <FormatSelector
            selected={formats}
            onChange={(ids) => updateRoleSettings(role.slug, { preferredFormats: ids })}
          />

          {/* ── Generation progress ── */}
          <GenerationProgress currentStep={progressStep} error={error} />

          {/* ── Error display ── */}
          {error && progressStep !== "error" && (
            <ErrorAlert
              message={error}
              details={errorDetails}
              onDismiss={() => setError(null)}
            />
          )}

          {/* ── Server-generated file downloads ── */}
          {serverFiles.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Generated Files</h3>
              <div className="flex flex-wrap gap-3">
                {serverFiles.map((f) => (
                  <button
                    key={f.filename}
                    onClick={() => downloadFile(f)}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow transition-colors cursor-pointer"
                  >
                    {f.format.toUpperCase()} ({formatSize(f.sizeBytes)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {result && <ResultsPanel result={result} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-4">
        ATS Resume Tailor — {role.label}
      </footer>
    </div>
  );
}
