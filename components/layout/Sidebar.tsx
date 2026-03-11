"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ROLES } from "@/lib/roles";

const MAIN_NAV = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/settings", label: "Settings", icon: "⚙\uFE0F" },
  { href: "/experience", label: "Experience", icon: "📄" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive(href)
        ? "bg-slate-700 text-white font-medium"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  const nav = (
    <>
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">ATS Resume Tailor</h1>
          <p className="text-xs text-slate-400 mt-0.5">AI-powered resume optimization</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {/* Main section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Main
          </p>
          <div className="space-y-1">
            {MAIN_NAV.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Roles section */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Roles
          </p>
          <div className="space-y-1">
            {ROLES.map((role) => (
              <Link
                key={role.slug}
                href={`/roles/${role.slug}`}
                className={linkClass(`/roles/${role.slug}`)}
              >
                <span className="text-base w-5 text-center">{role.icon}</span>
                {role.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-500">v0.1.0</p>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger button — visible on mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-slate-900 text-white p-2 rounded-lg shadow-lg cursor-pointer"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay — mobile only */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — always visible on lg+, drawer on mobile */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col z-50 transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {nav}
      </aside>
    </>
  );
}
