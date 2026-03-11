// ============================================================
// useResumeSlotStore — Zustand store for multi-slot resume
// storage and per-role settings (selected slot, custom
// instructions, template, formats).
//
// Persists to localStorage via Zustand persist middleware.
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ResumeSlot, RoleSettings } from "@/types";

const DEFAULT_ROLE_SETTINGS: RoleSettings = {
  selectedResumeSlotId: "",
  customInstructions: "",
  preferredTemplate: "",
  preferredFormats: [],
};

interface ResumeSlotState {
  slots: ResumeSlot[];
  roleSettings: Record<string, RoleSettings>;

  addSlot: (slot: ResumeSlot) => void;
  updateSlot: (id: string, updates: Partial<ResumeSlot>) => void;
  removeSlot: (id: string) => void;

  updateRoleSettings: (
    roleSlug: string,
    updates: Partial<RoleSettings>,
  ) => void;
}

export const useResumeSlotStore = create<ResumeSlotState>()(
  persist(
    (set) => ({
      slots: [],
      roleSettings: {},

      addSlot: (slot) =>
        set((state) => ({ slots: [...state.slots, slot] })),

      updateSlot: (id, updates) =>
        set((state) => ({
          slots: state.slots.map((s) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        })),

      removeSlot: (id) =>
        set((state) => ({
          slots: state.slots.filter((s) => s.id !== id),
          // Clear any role settings that reference this slot
          roleSettings: Object.fromEntries(
            Object.entries(state.roleSettings).map(([key, rs]) => [
              key,
              rs.selectedResumeSlotId === id
                ? { ...rs, selectedResumeSlotId: "" }
                : rs,
            ]),
          ),
        })),

      updateRoleSettings: (roleSlug, updates) =>
        set((state) => ({
          roleSettings: {
            ...state.roleSettings,
            [roleSlug]: {
              ...(state.roleSettings[roleSlug] ?? DEFAULT_ROLE_SETTINGS),
              ...updates,
            },
          },
        })),
    }),
    {
      name: "ats-resume-slots",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/** Helper to get role settings with defaults (for use outside React) */
export function getRoleSettingsWithDefaults(
  roleSettings: Record<string, RoleSettings>,
  roleSlug: string,
): RoleSettings {
  return { ...DEFAULT_ROLE_SETTINGS, ...(roleSettings[roleSlug] ?? {}) };
}
