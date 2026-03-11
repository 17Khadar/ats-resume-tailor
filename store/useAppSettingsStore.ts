// ============================================================
// useAppSettingsStore — Zustand store for app-wide settings.
// Persists: credentials, contact info, SMTP config,
// preferred template, output formats, last selected role.
//
// Local-first: uses localStorage via Zustand persist middleware.
// Designed so server persistence can later wrap or replace the
// storage layer without changing the store interface.
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ContactInfo, SmtpConfig, AppSettings } from "@/types";

interface AppSettingsActions {
  setOpenaiApiKey: (key: string) => void;
  setContact: (contact: Partial<ContactInfo>) => void;
  setSmtp: (smtp: Partial<SmtpConfig>) => void;
  setPreferredTemplate: (templateId: string) => void;
  setPreferredFormats: (formatIds: string[]) => void;
  setLastRole: (roleSlug: string | null) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: "",
  contact: {
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    location: "",
  },
  smtp: {
    host: "",
    port: "587",
    user: "",
    pass: "",
    from: "",
  },
  preferredTemplate: "professional-classic",
  preferredFormats: ["docx", "pdf"],
  lastRole: null,
};

export const useAppSettingsStore = create<AppSettings & AppSettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),

      setContact: (partial) =>
        set((state) => ({
          contact: { ...state.contact, ...partial },
        })),

      setSmtp: (partial) =>
        set((state) => ({
          smtp: { ...state.smtp, ...partial },
        })),

      setPreferredTemplate: (templateId) =>
        set({ preferredTemplate: templateId }),

      setPreferredFormats: (formatIds) =>
        set({ preferredFormats: formatIds }),

      setLastRole: (roleSlug) => set({ lastRole: roleSlug }),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "ats-resume-tailor-settings",
      storage: createJSONStorage(() => localStorage),
      // Version for future migrations when schema changes
      version: 1,
    },
  ),
);
