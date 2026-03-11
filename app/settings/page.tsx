"use client";

import { useState, useEffect } from "react";
import { usePersistedSettings } from "@/hooks/usePersistedSettings";
import * as api from "@/lib/apiClient";

export default function SettingsPage() {
  const {
    hydrated,
    openaiApiKey,
    contact,
    smtp,
    setOpenaiApiKey,
    setContact,
    setSmtp,
  } = usePersistedSettings();

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load settings from server on mount
  useEffect(() => {
    if (!hydrated) return;
    api.getSettings().then((data) => {
      if (data.openaiApiKey) setOpenaiApiKey(data.openaiApiKey);
      if (data.contact) setContact(data.contact);
      if (data.smtp) setSmtp(data.smtp);
    }).catch(() => {
      // Server unavailable — continue with local state
    });
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to server + show confirmation
  const handleSave = async () => {
    setSaving(true);
    setSyncError(null);
    try {
      await api.saveSettings({
        openaiApiKey,
        contact,
        smtp,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Failed to save settings to server.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between max-w-4xl">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure your credentials and personal information. These values persist across sessions.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="mx-8 mt-4 max-w-4xl">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
            Settings saved successfully.
          </div>
        </div>
      )}

      {/* Sync error */}
      {syncError && (
        <div className="mx-8 mt-4 max-w-4xl">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            {syncError}
          </div>
        </div>
      )}

      <div className="px-8 py-6 space-y-6 max-w-4xl">
        {/* API Configuration */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">API Configuration</h2>
          <p className="text-sm text-gray-500 mb-4">
            Provide your OpenAI API key for AI-powered resume tailoring. Without it, the system uses rule-based tailoring.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-..."
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">
              Persisted on the server. Falls back to browser storage when the server is unavailable.
            </p>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Contact Information</h2>
          <p className="text-sm text-gray-500 mb-4">
            This information appears at the top of your generated resumes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={contact.name}
                onChange={(e) => setContact({ name: e.target.value })}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => setContact({ email: e.target.value })}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={contact.phone}
                onChange={(e) => setContact({ phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={contact.linkedin}
                onChange={(e) => setContact({ linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/yourprofile"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={contact.location}
                onChange={(e) => setContact({ location: e.target.value })}
                placeholder="City, State"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Email Delivery */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Email Delivery</h2>
          <p className="text-sm text-gray-500 mb-4">
            Configure SMTP settings to send generated resumes directly to an email address.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
              <input
                type="text"
                value={smtp.host}
                onChange={(e) => setSmtp({ host: e.target.value })}
                placeholder="smtp.gmail.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
              <input
                type="text"
                value={smtp.port}
                onChange={(e) => setSmtp({ port: e.target.value })}
                placeholder="587"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
              <input
                type="text"
                value={smtp.user}
                onChange={(e) => setSmtp({ user: e.target.value })}
                placeholder="username"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
              <input
                type="password"
                value={smtp.pass}
                onChange={(e) => setSmtp({ pass: e.target.value })}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">From Address</label>
              <input
                type="email"
                value={smtp.from}
                onChange={(e) => setSmtp({ from: e.target.value })}
                placeholder="noreply@example.com"
                className={inputClass}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
