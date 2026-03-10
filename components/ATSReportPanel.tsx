// ============================================================
// ATSReportPanel — displays the ATS strategy report
// ============================================================
"use client";

import type { ATSReport } from "@/types";

interface Props {
  report: ATSReport;
}

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? "bg-green-100 text-green-800" : pct >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}/{max}</span>;
}

export default function ATSReportPanel({ report }: Props) {
  const rb = report.rubricBreakdown;

  const rubricItems = [
    rb.titleExactMatch,
    rb.mustHaveCoverage,
    rb.responsibilitiesMirrored,
    rb.cloudAlignment,
    rb.domainAndFormatting,
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
      <h2 className="text-lg font-bold text-gray-900">ATS Strategy Report</h2>

      {/* Overall score */}
      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold text-blue-700">{report.atsScore}</div>
        <div>
          <p className="text-sm text-gray-500">out of {rb.maxTotal}</p>
          <p className="text-sm font-medium text-gray-700">ATS Match Score</p>
        </div>
        <div className="ml-auto">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
            report.atsScore >= 8 ? "bg-green-100 text-green-800" :
            report.atsScore >= 5 ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }`}>
            {report.atsScore >= 8 ? "Strong Match" : report.atsScore >= 5 ? "Moderate Match" : "Needs Work"}
          </span>
        </div>
      </div>

      {/* Master selection */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
        <p className="text-sm"><span className="font-semibold text-gray-700">JD Source:</span> {report.jdSource}</p>
        <p className="text-sm"><span className="font-semibold text-gray-700">Selected Master:</span> {report.selectedMaster.toUpperCase()}</p>
        <p className="text-sm"><span className="font-semibold text-gray-700">Cloud Reason:</span> {report.cloudReason}</p>
      </div>

      {/* Rubric breakdown */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-2">Scoring Rubric Breakdown</h3>
        <div className="space-y-2">
          {rubricItems.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{item.category}</p>
                {item.notes.map((note, j) => (
                  <p key={j} className="text-xs text-gray-500">{note}</p>
                ))}
              </div>
              <ScoreBadge score={item.score} max={item.max} />
            </div>
          ))}
        </div>
      </div>

      {/* Keywords */}
      {report.topKeywordsIntegrated.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-2">Top Keywords Integrated</h3>
          <div className="flex flex-wrap gap-1.5">
            {report.topKeywordsIntegrated.map((kw, i) => (
              <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {/* Learnable skills */}
      {report.learnableSkillsAdded.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-2">Learnable Skills Added</h3>
          <div className="flex flex-wrap gap-1.5">
            {report.learnableSkillsAdded.map((sk, i) => (
              <span key={i} className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">{sk}</span>
            ))}
          </div>
        </div>
      )}

      {/* Domain/compliance audit */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-2">Domain & Compliance Audit</h3>
        {report.domainComplianceAudit.notes.map((note, i) => (
          <p key={i} className="text-xs text-gray-600">{note}</p>
        ))}
      </div>

      {/* Formatting QA */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2 py-1 rounded ${
          report.formattingQaStatus.isAtsSafe ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {report.formattingQaStatus.isAtsSafe ? "PASS" : "WARN"}
        </span>
        <span className="text-sm text-gray-600">Formatting QA: No clipping / no bullet gaps / clean contact line / no partial bold</span>
      </div>
    </div>
  );
}
