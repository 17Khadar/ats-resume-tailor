// ============================================================
// GenerationProgress — safe visible progress steps display.
// Shows only user-facing pipeline stages. Does NOT expose
// internal chain-of-thought or AI reasoning.
// ============================================================
"use client";

export type ProgressStep =
  | "idle"
  | "parsing-jd"
  | "resolving-source"
  | "identifying-skills"
  | "matching-experience"
  | "drafting-resume"
  | "building-report"
  | "generating-files"
  | "complete"
  | "error";

interface StepDef {
  key: ProgressStep;
  label: string;
  description: string;
}

const STEPS: StepDef[] = [
  {
    key: "parsing-jd",
    label: "Parsing JD",
    description: "Extracting structure, requirements, and keywords from the job description",
  },
  {
    key: "resolving-source",
    label: "Resolving Posting Source",
    description: "Determining job posting origin and retrieving full content",
  },
  {
    key: "identifying-skills",
    label: "Identifying Must-Have Skills",
    description: "Analyzing required and preferred skills against your resume",
  },
  {
    key: "matching-experience",
    label: "Matching Experience",
    description: "Aligning your work history with job responsibilities",
  },
  {
    key: "drafting-resume",
    label: "Drafting Resume",
    description: "Generating tailored resume sections optimized for ATS scoring",
  },
  {
    key: "building-report",
    label: "Building ATS Report",
    description: "Scoring resume against ATS rubric and running boost passes",
  },
  {
    key: "generating-files",
    label: "Generating Files",
    description: "Creating output documents in selected formats",
  },
];

interface Props {
  currentStep: ProgressStep;
  error?: string | null;
}

function stepIndex(step: ProgressStep): number {
  const idx = STEPS.findIndex((s) => s.key === step);
  if (step === "complete") return STEPS.length;
  return idx >= 0 ? idx : -1;
}

export default function GenerationProgress({ currentStep, error }: Props) {
  if (currentStep === "idle") return null;

  const current = stepIndex(currentStep);
  const isComplete = currentStep === "complete";
  const isError = currentStep === "error";

  return (
    <section className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Generation Progress</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isComplete
              ? "Resume generation complete!"
              : isError
                ? "An error occurred during generation."
                : "Processing your request..."}
          </p>
        </div>

        {/* Overall status badge */}
        {isComplete && (
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
            Complete
          </span>
        )}
        {isError && (
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
            Error
          </span>
        )}
        {!isComplete && !isError && (
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full animate-pulse">
            In Progress
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
        <div
          className={`h-2 rounded-full transition-all duration-500 ease-out ${
            isError ? "bg-red-500" : isComplete ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{
            width: `${isComplete ? 100 : current >= 0 ? ((current + 1) / STEPS.length) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Step list */}
      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const isDone = current > idx || isComplete;
          const isActive = current === idx && !isComplete && !isError;
          const isFailed = isError && current === idx;
          const isPending = current < idx && !isComplete;

          return (
            <div
              key={step.key}
              className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? "bg-blue-50" : isFailed ? "bg-red-50" : ""
              }`}
            >
              {/* Step indicator */}
              <div className="mt-0.5 flex-shrink-0">
                {isDone && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {isActive && (
                  <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                )}
                {isFailed && (
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                {isPending && (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 bg-white" />
                )}
              </div>

              {/* Step content */}
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isDone
                      ? "text-green-800"
                      : isActive
                        ? "text-blue-900"
                        : isFailed
                          ? "text-red-800"
                          : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    isDone
                      ? "text-green-600"
                      : isActive
                        ? "text-blue-600"
                        : isFailed
                          ? "text-red-600"
                          : "text-gray-300"
                  }`}
                >
                  {isFailed && error ? error : step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
