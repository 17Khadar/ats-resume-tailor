// ============================================================
// ResultsPanel — wraps ResumePreview + ATSReportPanel + Download
// ============================================================
"use client";

import type { TailorResumeResponse } from "@/types";
import ResumePreview from "./ResumePreview";
import ATSReportPanel from "./ATSReportPanel";
import { useState } from "react";

interface Props {
  result: TailorResumeResponse;
}

export default function ResultsPanel({ result }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadDocx = async () => {
    setDownloading(true);
    try {
      const response = await fetch("/api/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: result.resume,
          report: result.report,
          contactInfo: result.contactInfo,
        }),
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tailored_Resume_${result.parsedJD.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate DOCX. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: result.resume,
          contactInfo: result.contactInfo,
        }),
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tailored_Resume_${result.parsedJD.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick summary bar */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl shadow-md p-5 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm text-gray-500">Detected JD Title</p>
          <p className="text-base font-bold text-gray-900">{result.parsedJD.title}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-sm text-gray-500">Location</p>
          <p className="text-base font-semibold text-gray-800">{result.parsedJD.location}</p>
        </div>
        <div className="flex-1 min-w-[130px]">
          <p className="text-sm text-gray-500">Selected Master</p>
          <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${
            result.selectedMaster === "aws"
              ? "bg-orange-100 text-orange-800"
              : "bg-blue-100 text-blue-800"
          }`}>
            {result.selectedMaster.toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-[100px]">
          <p className="text-sm text-gray-500">ATS Score</p>
          <p className="text-2xl font-bold text-blue-700">{result.report.atsScore}/10</p>
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleDownloadDocx}
          disabled={downloading}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {downloading ? "Generating..." : "Download DOCX"}
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {downloadingPdf ? "Generating..." : "Download PDF"}
        </button>
      </div>

      {/* Resume preview & ATS report side by side on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResumePreview resume={result.resume} contactInfo={result.contactInfo} />
        <ATSReportPanel report={result.report} />
      </div>
    </div>
  );
}
