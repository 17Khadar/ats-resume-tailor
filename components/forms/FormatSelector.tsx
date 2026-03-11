// ============================================================
// FormatSelector — multi-select output format picker
// ============================================================
"use client";

import { OUTPUT_FORMATS, type OutputFormatConfig } from "@/lib/outputFormats";

interface Props {
  selected: string[];
  onChange: (formatIds: string[]) => void;
}

export default function FormatSelector({ selected, onChange }: Props) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      // Don't allow deselecting everything — keep at least one
      if (selected.length > 1) {
        onChange(selected.filter((f) => f !== id));
      }
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Output Formats</h2>
      <p className="text-sm text-gray-500 mb-4">
        Select which file formats to generate. At least one format is required.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {OUTPUT_FORMATS.map((fmt: OutputFormatConfig) => {
          const isActive = selected.includes(fmt.id);

          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => toggle(fmt.id)}
              className={`relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                isActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {/* Checkbox indicator */}
              <div
                className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-colors ${
                  isActive
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-gray-300 bg-white"
                }`}
              >
                {isActive && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <span className={`text-lg font-bold ${isActive ? "text-blue-700" : "text-gray-700"}`}>
                {fmt.extension}
              </span>
              <span className={`text-sm font-medium mt-1 ${isActive ? "text-blue-900" : "text-gray-900"}`}>
                {fmt.label}
              </span>
              <span className={`text-xs mt-1 leading-snug ${isActive ? "text-blue-600" : "text-gray-400"}`}>
                {fmt.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
