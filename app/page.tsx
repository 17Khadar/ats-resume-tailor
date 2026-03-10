// ============================================================
// Main Page — ATS Resume Tailor application
// ============================================================
"use client";

import { useState } from "react";
import type { JobInput, TailorResumeResponse, ErrorResponse } from "@/types";
import Header from "@/components/Header";
import MasterResumeUpload from "@/components/MasterResumeUpload";
import JobInputForm from "@/components/JobInputForm";
import ResultsPanel from "@/components/ResultsPanel";
import LoadingOverlay from "@/components/LoadingOverlay";
import ErrorAlert from "@/components/ErrorAlert";

export default function Home() {
  // Master resume files
  const [awsFile, setAwsFile] = useState<File | null>(null);
  const [azureFile, setAzureFile] = useState<File | null>(null);

  // Job input form state
  const [jobInput, setJobInput] = useState<JobInput>({});

  // Processing state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>();

  // Results
  const [result, setResult] = useState<TailorResumeResponse | null>(null);

  const hasResumes = !!(awsFile || azureFile);

  const handleSubmit = async () => {
    setError(null);
    setErrorDetails(undefined);
    setResult(null);
    setIsLoading(true);

    try {
      // Build FormData with all inputs + resume files
      const formData = new FormData();

      if (jobInput.jobId) formData.append("jobId", jobInput.jobId);
      if (jobInput.companyName) formData.append("companyName", jobInput.companyName);
      if (jobInput.jdUrl) formData.append("jdUrl", jobInput.jdUrl);
      if (jobInput.jdText) formData.append("jdText", jobInput.jdText);
      if (awsFile) formData.append("awsMaster", awsFile);
      if (azureFile) formData.append("azureMaster", azureFile);

      const response = await fetch("/api/tailor-resume", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errData = data as ErrorResponse;
        setError(errData.error || "Something went wrong.");
        setErrorDetails(errData.details);
        return;
      }

      setResult(data as TailorResumeResponse);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Upload section */}
        <MasterResumeUpload
          awsFile={awsFile}
          azureFile={azureFile}
          onAwsUpload={setAwsFile}
          onAzureUpload={setAzureFile}
        />

        {/* Job input form */}
        <JobInputForm
          jobInput={jobInput}
          onChange={setJobInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          hasResumes={hasResumes}
        />

        {/* Error display */}
        {error && (
          <ErrorAlert
            message={error}
            details={errorDetails}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Results */}
        {result && <ResultsPanel result={result} />}
      </main>

      {/* Loading overlay */}
      {isLoading && <LoadingOverlay />}

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-4">
        ATS Resume Tailor - Built for recruiter workflow optimization
      </footer>
    </div>
  );
}
