// ============================================================
// LoadingOverlay — full-screen loading indicator
// ============================================================
"use client";

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
        <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-800 font-semibold text-center">Analyzing JD &amp; Tailoring Resume...</p>
        <p className="text-gray-500 text-sm text-center">This may take a few seconds</p>
      </div>
    </div>
  );
}
