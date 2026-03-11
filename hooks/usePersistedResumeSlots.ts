// ============================================================
// usePersistedResumeSlots — hydration-safe hook for the
// resume slot store. Provides convenience helpers for
// filtering slots by role and accessing per-role settings.
// ============================================================

"use client";

import { useEffect, useState } from "react";
import {
  useResumeSlotStore,
  getRoleSettingsWithDefaults,
} from "@/store/useResumeSlotStore";
import type { ResumeSlot, RoleSettings } from "@/types";

export function usePersistedResumeSlots() {
  const [hydrated, setHydrated] = useState(false);

  const slots = useResumeSlotStore((s) => s.slots);
  const roleSettings = useResumeSlotStore((s) => s.roleSettings);
  const addSlot = useResumeSlotStore((s) => s.addSlot);
  const updateSlot = useResumeSlotStore((s) => s.updateSlot);
  const removeSlot = useResumeSlotStore((s) => s.removeSlot);
  const updateRoleSettings = useResumeSlotStore((s) => s.updateRoleSettings);

  useEffect(() => {
    setHydrated(true);
  }, []);

  /** Get all slots matching a role slug (by roleHint), plus any untagged slots */
  const getSlotsForRole = (roleSlug: string): ResumeSlot[] => {
    return slots.filter(
      (s) => !s.roleHint || s.roleHint === roleSlug,
    );
  };

  /** Get settings for a specific role with defaults */
  const getSettings = (roleSlug: string): RoleSettings => {
    return getRoleSettingsWithDefaults(roleSettings, roleSlug);
  };

  /** Get the currently selected slot for a role */
  const getSelectedSlot = (roleSlug: string): ResumeSlot | undefined => {
    const settings = getSettings(roleSlug);
    if (!settings.selectedResumeSlotId) return undefined;
    return slots.find((s) => s.id === settings.selectedResumeSlotId);
  };

  return {
    hydrated,
    slots,
    addSlot,
    updateSlot,
    removeSlot,
    getSlotsForRole,
    getSettings,
    getSelectedSlot,
    updateRoleSettings,
  };
}
