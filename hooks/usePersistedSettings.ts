// ============================================================
// usePersistedSettings — convenience hook that exposes the
// app settings store with hydration-safe access.
//
// Handles the Zustand persist hydration timing issue in Next.js
// (store hydrates async from localStorage after first render).
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { useAppSettingsStore } from "@/store/useAppSettingsStore";
import type { ContactInfo, SmtpConfig } from "@/types";

export function usePersistedSettings() {
  const [hydrated, setHydrated] = useState(false);

  const openaiApiKey = useAppSettingsStore((s) => s.openaiApiKey);
  const contact = useAppSettingsStore((s) => s.contact);
  const smtp = useAppSettingsStore((s) => s.smtp);
  const preferredTemplate = useAppSettingsStore((s) => s.preferredTemplate);
  const preferredFormats = useAppSettingsStore((s) => s.preferredFormats);
  const lastRole = useAppSettingsStore((s) => s.lastRole);

  const setOpenaiApiKey = useAppSettingsStore((s) => s.setOpenaiApiKey);
  const setContact = useAppSettingsStore((s) => s.setContact);
  const setSmtp = useAppSettingsStore((s) => s.setSmtp);
  const setPreferredTemplate = useAppSettingsStore((s) => s.setPreferredTemplate);
  const setPreferredFormats = useAppSettingsStore((s) => s.setPreferredFormats);
  const setLastRole = useAppSettingsStore((s) => s.setLastRole);
  const resetSettings = useAppSettingsStore((s) => s.resetSettings);

  useEffect(() => {
    // Zustand persist rehydrates on mount; mark ready after first render
    setHydrated(true);
  }, []);

  return {
    hydrated,
    openaiApiKey,
    contact,
    smtp,
    preferredTemplate,
    preferredFormats,
    lastRole,
    setOpenaiApiKey,
    setContact: (partial: Partial<ContactInfo>) => setContact(partial),
    setSmtp: (partial: Partial<SmtpConfig>) => setSmtp(partial),
    setPreferredTemplate,
    setPreferredFormats,
    setLastRole,
    resetSettings,
  };
}
