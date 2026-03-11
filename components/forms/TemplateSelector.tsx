// ============================================================
// TemplateSelector — ATS-safe resume template style picker
// ============================================================
"use client";

import { TEMPLATES, type TemplateConfig } from "@/lib/templates";

interface Props {
  selected: string;
  onChange: (templateId: string) => void;
}

export default function TemplateSelector({ selected, onChange }: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Resume Template</h2>
      <p className="text-sm text-gray-500 mb-4">
        Choose an ATS-safe template style. All templates are optimized for applicant tracking systems.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((tpl: TemplateConfig) => {
          const isActive = selected === tpl.id;

          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onChange(tpl.id)}
              className={`relative text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                isActive
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {/* Default badge */}
              {tpl.isDefault && (
                <span className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Default
                </span>
              )}

              <div className="text-2xl mb-2">{tpl.preview}</div>
              <h3 className={`text-sm font-semibold ${isActive ? "text-blue-900" : "text-gray-900"}`}>
                {tpl.name}
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${isActive ? "text-blue-700" : "text-gray-500"}`}>
                {tpl.description}
              </p>

              {/* Selection indicator */}
              <div className="mt-3 flex items-center gap-1.5">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isActive ? "border-blue-500" : "border-gray-300"
                  }`}
                >
                  {isActive && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                <span className={`text-xs ${isActive ? "text-blue-700 font-medium" : "text-gray-400"}`}>
                  {isActive ? "Selected" : "Select"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
