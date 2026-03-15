// ============================================================
// LLMStatus — shows whether LLM was used for this generation
// ============================================================
"use client";

import Link from "next/link";

interface Props {
  llmUsed: boolean;
  generationMode: "llm" | "fallback";
}

export default function LLMStatus({ llmUsed, generationMode }: Props) {
  return (
    <div className="my-4">
      {llmUsed ? (
        <div className="flex items-center gap-3 bg-green-100 border-2 border-green-400 rounded-xl px-6 py-3 shadow-sm">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          <span className="text-green-900 text-base font-bold tracking-wide">LLM used for this generation</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-blue-800 text-sm font-medium">
            LLM was not used for this generation. You can connect your LLM API key in Settings to enable richer resume generation next time.
          </span>
          <Link href="/settings" className="ml-2 text-blue-700 underline hover:text-blue-900 text-sm font-semibold">
            Go to Settings
          </Link>
        </div>
      )}
    </div>
  );
}