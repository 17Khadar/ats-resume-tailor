// ============================================================
// ResumeSlotSelector — lets the user pick a saved resume slot
// for the current role page. Shows slots filtered by role,
// with specialization badges. Remembers selection per role.
// ============================================================
"use client";

import Link from "next/link";
import type { ResumeSlot } from "@/types";

interface Props {
  /** Label shown above the selector, e.g. "Select your Data Engineer resume" */
  label: string;
  /** All slots relevant to this role (pre-filtered by caller) */
  slots: ResumeSlot[];
  /** All available slots (unfiltered, for "show all" toggle) */
  allSlots: ResumeSlot[];
  /** Currently selected slot ID */
  selectedSlotId: string;
  /** Called when the user selects a slot */
  onSelect: (slotId: string) => void;
  /** Advisory message (e.g. cloud mismatch warning) */
  advisory?: string;
}

export default function ResumeSlotSelector({
  label,
  slots,
  allSlots,
  selectedSlotId,
  onSelect,
  advisory,
}: Props) {
  const hasSlots = allSlots.length > 0;
  const displaySlots = slots.length > 0 ? slots : allSlots;

  if (!hasSlots) {
    return (
      <section className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">{label}</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-3">
          <p className="text-sm text-amber-800 font-medium">
            No resume profiles saved yet.
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Go to the{" "}
            <Link href="/experience" className="text-blue-600 underline font-semibold">
              Experience page
            </Link>{" "}
            to upload and manage your base resumes first.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">{label}</h2>
      <p className="text-sm text-gray-500 mb-4">
        Choose a base resume to use for this generation. You can manage resume slots on the{" "}
        <Link href="/experience" className="text-blue-600 underline">
          Experience page
        </Link>
        .
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displaySlots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelect(slot.id)}
              className={`relative text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {/* Selection indicator */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-blue-500" : "border-gray-300"
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                <span className={`text-sm font-semibold ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                  {slot.label || "Untitled Resume"}
                </span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {slot.specialization && (
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                    {slot.specialization}
                  </span>
                )}
                {slot.roleHint && (
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                    {slot.roleHint}
                  </span>
                )}
                {slot.tags?.map((tag) => (
                  <span key={tag} className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              {/* File info */}
              {slot.originalFileName && (
                <p className={`text-xs truncate ${isSelected ? "text-blue-600" : "text-gray-400"}`}>
                  {slot.originalFileName}
                </p>
              )}
              {slot.notes && (
                <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? "text-blue-600" : "text-gray-400"}`}>
                  {slot.notes}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Advisory (e.g. cloud mismatch) */}
      {advisory && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">{advisory}</p>
        </div>
      )}

      {/* Validation hint */}
      {!selectedSlotId && (
        <p className="text-sm text-amber-600 font-medium mt-3">
          Please select a resume profile before generating.
        </p>
      )}
    </section>
  );
}
