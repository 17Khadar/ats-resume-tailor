// ============================================================
// usePersistedProfile — convenience hook that exposes the
// profile store with hydration-safe access.
//
// Handles Zustand persist hydration timing in Next.js and
// provides helper utilities for the experience page.
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { useProfileStore } from "@/store/useProfileStore";

export function usePersistedProfile() {
  const [hydrated, setHydrated] = useState(false);

  const awsFile = useProfileStore((s) => s.awsFile);
  const azureFile = useProfileStore((s) => s.azureFile);
  const awsMeta = useProfileStore((s) => s.awsMeta);
  const azureMeta = useProfileStore((s) => s.azureMeta);
  const awsUploadId = useProfileStore((s) => s.awsUploadId);
  const azureUploadId = useProfileStore((s) => s.azureUploadId);

  const setAwsFile = useProfileStore((s) => s.setAwsFile);
  const setAzureFile = useProfileStore((s) => s.setAzureFile);
  const setAwsUploadId = useProfileStore((s) => s.setAwsUploadId);
  const setAzureUploadId = useProfileStore((s) => s.setAzureUploadId);
  const clearAws = useProfileStore((s) => s.clearAws);
  const clearAzure = useProfileStore((s) => s.clearAzure);
  const resetProfile = useProfileStore((s) => s.resetProfile);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const hasResumes = !!(awsFile || azureFile || awsUploadId || azureUploadId);

  return {
    hydrated,
    awsFile,
    azureFile,
    awsMeta,
    azureMeta,
    awsUploadId,
    azureUploadId,
    hasResumes,
    setAwsFile,
    setAzureFile,
    setAwsUploadId,
    setAzureUploadId,
    clearAws,
    clearAzure,
    resetProfile,
  };
}
