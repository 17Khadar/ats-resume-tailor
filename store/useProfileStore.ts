// ============================================================
// useProfileStore — Zustand store for base resume / experience
// profile data. Persists metadata locally; actual File objects
// are session-scoped (cannot be serialized to localStorage).
//
// Local-first: metadata persisted via Zustand persist middleware.
// Designed so server persistence can later store the actual
// files and replace the metadata-only approach.
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ResumeMeta {
  name: string;
  size: number;
  uploadedAt: string;
}

export interface ProfileState {
  // Persisted metadata (survives refresh)
  awsMeta: ResumeMeta | null;
  azureMeta: ResumeMeta | null;

  // Server-side upload IDs (persisted — used for generation)
  awsUploadId: string | null;
  azureUploadId: string | null;

  // Session-only File references (not persisted — lost on refresh)
  awsFile: File | null;
  azureFile: File | null;
}

interface ProfileActions {
  setAwsFile: (file: File | null) => void;
  setAzureFile: (file: File | null) => void;
  setAwsUploadId: (id: string | null) => void;
  setAzureUploadId: (id: string | null) => void;
  clearAws: () => void;
  clearAzure: () => void;
  resetProfile: () => void;
}

const DEFAULT_PROFILE: ProfileState = {
  awsMeta: null,
  azureMeta: null,
  awsUploadId: null,
  azureUploadId: null,
  awsFile: null,
  azureFile: null,
};

export const useProfileStore = create<ProfileState & ProfileActions>()(
  persist(
    (set) => ({
      ...DEFAULT_PROFILE,

      setAwsFile: (file) => {
        if (file) {
          const meta: ResumeMeta = {
            name: file.name,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          };
          set({ awsFile: file, awsMeta: meta });
        } else {
          set({ awsFile: null });
        }
      },

      setAzureFile: (file) => {
        if (file) {
          const meta: ResumeMeta = {
            name: file.name,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          };
          set({ azureFile: file, azureMeta: meta });
        } else {
          set({ azureFile: null });
        }
      },

      setAwsUploadId: (id) => set({ awsUploadId: id }),

      setAzureUploadId: (id) => set({ azureUploadId: id }),

      clearAws: () => set({ awsFile: null, awsMeta: null, awsUploadId: null }),

      clearAzure: () => set({ azureFile: null, azureMeta: null, azureUploadId: null }),

      resetProfile: () => set(DEFAULT_PROFILE),
    }),
    {
      name: "ats-resume-tailor-profile",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Only persist metadata — File objects are not serializable
      partialize: (state) => ({
        awsMeta: state.awsMeta,
        azureMeta: state.azureMeta,
        awsUploadId: state.awsUploadId,
        azureUploadId: state.azureUploadId,
      }),
    },
  ),
);
