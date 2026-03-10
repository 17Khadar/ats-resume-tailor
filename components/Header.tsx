// ============================================================
// Header — app title and subtitle
// ============================================================
"use client";

export default function Header() {
  return (
    <header className="w-full bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-8 px-6 shadow-lg">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          ATS Resume Tailor
        </h1>
        <p className="mt-2 text-blue-100 text-base md:text-lg">
          Upload master resumes, provide a job description, and generate an ATS-optimized tailored resume
        </p>
      </div>
    </header>
  );
}
