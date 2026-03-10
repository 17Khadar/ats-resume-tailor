// ============================================================
// ResumePreview — structured preview of the tailored resume
// ============================================================
"use client";

import type { ContactInfo, ResumeSectionOutput } from "@/types";

interface Props {
  resume: ResumeSectionOutput;
  contactInfo: ContactInfo;
}

export default function ResumePreview({ resume, contactInfo }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Tailored Resume Preview</h2>

      {/* Contact Header */}
      <div className="text-center space-y-1">
        {contactInfo.name && (
          <h3 className="text-xl font-bold text-gray-900">{contactInfo.name}</h3>
        )}
        <p className="text-sm text-gray-600">
          {[contactInfo.email, contactInfo.phone, contactInfo.linkedin, contactInfo.location]
            .filter(Boolean)
            .join(" | ")}
        </p>
      </div>

      {/* Summary */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-300 pb-1 mb-2">
          Summary
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">{resume.summary}</p>
      </div>

      {/* Skills */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-300 pb-1 mb-2">
          Skills
        </h4>
        <ul className="space-y-0.5">
          {resume.skills.map((line, i) => {
            const colonIdx = line.indexOf(":");
            if (colonIdx > 0) {
              const category = line.substring(0, colonIdx + 1);
              const rest = line.substring(colonIdx + 1);
              return (
                <li key={i} className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                  <span className="font-bold">{category}</span>{rest}
                </li>
              );
            }
            return (
              <li key={i} className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                {line}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Work Experience */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-300 pb-1 mb-2">
          Work Experience
        </h4>
        {resume.workExperience.map((exp, i) => (
          <div key={i} className="mb-4">
            <p className="text-sm font-bold text-gray-800">
              {[exp.role, exp.company, exp.duration].filter(Boolean).join(" | ")}
            </p>
            <ul className="mt-1 space-y-0.5">
              {exp.bullets.map((bullet, j) => (
                <li key={j} className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Education */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-300 pb-1 mb-2">
          Education
        </h4>
        {resume.education.map((edu, i) => (
          <p key={i} className="text-sm text-gray-700">
            {[edu.degree, edu.institution, edu.year].filter(Boolean).join(" | ")}
          </p>
        ))}
      </div>
    </div>
  );
}
