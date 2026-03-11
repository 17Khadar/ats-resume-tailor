// ============================================================
// EditProfileButtons — quick navigation back to settings,
// experience, and home pages
// ============================================================
"use client";

import Link from "next/link";

export default function EditProfileButtons() {
  const links = [
    {
      href: "/",
      label: "Home",
      icon: "🏠",
      description: "Back to dashboard",
      color: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    },
    {
      href: "/settings",
      label: "Settings",
      icon: "⚙️",
      description: "Edit credentials & config",
      color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    },
    {
      href: "/experience",
      label: "Experience",
      icon: "📄",
      description: "Edit base resumes",
      color: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${link.color}`}
        >
          <span>{link.icon}</span>
          <span>{link.label}</span>
          <span className="text-xs opacity-60 hidden sm:inline">— {link.description}</span>
        </Link>
      ))}
    </div>
  );
}
