// ============================================================
// Dashboard — navigation hub and overview page.
// Resume generation happens in individual role pages.
// ============================================================
"use client";

import Link from "next/link";
import { ROLES } from "@/lib/roles";
import { usePersistedResumeSlots } from "@/hooks/usePersistedResumeSlots";

export default function Home() {
  const { hydrated, slots } = usePersistedResumeSlots();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        {/* ── Welcome ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            Welcome to ATS Resume Tailor. Upload your resumes on the Experience page,
            then open a role page to generate a tailored, ATS-optimized resume.
          </p>
        </section>

        {/* ── Quick Navigation ── */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/settings"
              className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">Settings</h3>
              <p className="text-sm text-gray-500 mt-1">Configure API credentials and contact information</p>
            </Link>
            <Link
              href="/experience"
              className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="text-2xl mb-2">📄</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">Experience</h3>
              <p className="text-sm text-gray-500 mt-1">Upload and manage your base resume profiles</p>
            </Link>
            <div className="p-5 bg-white rounded-xl border border-gray-200">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold text-gray-900">Resume Profiles</h3>
              <p className="text-sm text-gray-500 mt-1">
                {hydrated ? `${slots.length} resume slot${slots.length !== 1 ? "s" : ""} saved` : "Loading..."}
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-gray-200" />

        {/* ── Role Pages ── */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Generate by Role</h2>
          <p className="text-sm text-gray-500 mb-4">
            Select a role to open its tailoring workspace. Each role page lets you choose a base resume,
            enter a job description, customize instructions, and generate an ATS-optimized resume.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map((role) => (
              <Link
                key={role.slug}
                href={`/roles/${role.slug}`}
                className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{role.icon}</span>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                    {role.label}
                  </h3>
                </div>
                <p className="text-sm text-gray-500">{role.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Saved Resume Summary ── */}
        {hydrated && slots.length > 0 && (
          <>
            <div className="border-t border-gray-200" />
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Saved Resume Profiles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="bg-white rounded-xl border border-gray-200 p-4"
                  >
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {slot.label || "Untitled Resume"}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {slot.specialization && (
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                          {slot.specialization}
                        </span>
                      )}
                      {slot.roleHint && (
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                          {slot.roleHint}
                        </span>
                      )}
                    </div>
                    {slot.originalFileName && (
                      <p className="text-xs text-gray-400 mt-2 truncate">{slot.originalFileName}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-4">
        ATS Resume Tailor — Built for recruiter workflow optimization
      </footer>
    </div>
  );
}
