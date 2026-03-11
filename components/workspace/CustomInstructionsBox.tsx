// ============================================================
// CustomInstructionsBox — optional per-role instructions that
// are included in the generation pipeline. Instructions are
// followed within system safety/truth constraints.
// ============================================================
"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitted: boolean;
  placeholder?: string;
}

export default function CustomInstructionsBox({
  value,
  onChange,
  onSubmit,
  submitted,
  placeholder,
}: Props) {
  const hasContent = value.trim().length > 0;

  return (
    <section className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Custom Instructions</h2>
      <p className="text-sm text-gray-500 mb-3">
        Optional guidance for this generation. Instructions are honored within truth and ATS safety constraints
        — they cannot add false experience, fake tools, or fabricated credentials.
      </p>

      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        disabled={submitted}
        placeholder={placeholder || "Add optional instructions for this generation..."}
        rows={3}
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none resize-y ${
          submitted
            ? "border-green-300 bg-green-50 text-gray-700 cursor-not-allowed"
            : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        }`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
        <div>
          {submitted && (
            <p className="text-xs text-green-600 font-medium">
              ✓ Instructions locked — will be used in next generation.
            </p>
          )}
          {!submitted && hasContent && (
            <p className="text-xs text-amber-600">
              Click &ldquo;Submit Instructions&rdquo; to confirm before generating.
            </p>
          )}
        </div>

        {hasContent && !submitted && (
          <button
            type="button"
            onClick={onSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg shadow transition-colors cursor-pointer"
          >
            Submit Instructions
          </button>
        )}
        {submitted && (
          <button
            type="button"
            onClick={() => {
              onChange("");
            }}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </section>
  );
}
