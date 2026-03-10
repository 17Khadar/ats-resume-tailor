// ============================================================
// MasterResumeUpload — upload AWS & Azure master resumes
// ============================================================
"use client";

import { useRef } from "react";

interface Props {
  awsFile: File | null;
  azureFile: File | null;
  onAwsUpload: (file: File) => void;
  onAzureUpload: (file: File) => void;
}

function UploadCard({
  label,
  file,
  onUpload,
  color,
}: {
  label: string;
  file: File | null;
  onUpload: (f: File) => void;
  color: "orange" | "blue";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onUpload(f);
  };

  const borderColor = color === "orange" ? "border-orange-400" : "border-blue-400";
  const bgColor = color === "orange" ? "bg-orange-50" : "bg-blue-50";
  const badgeBg = color === "orange" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800";
  const btnBg = color === "orange"
    ? "bg-orange-600 hover:bg-orange-700"
    : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className={`border-2 ${borderColor} ${bgColor} rounded-xl p-5 flex flex-col items-center gap-3`}>
      <h3 className="font-semibold text-gray-800 text-center">{label}</h3>

      {file ? (
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${badgeBg}`}>
          {file.name}
        </span>
      ) : (
        <span className="text-sm text-gray-500">No file uploaded</span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={handleChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`${btnBg} text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer`}
      >
        {file ? "Replace" : "Upload"} .docx
      </button>
    </div>
  );
}

export default function MasterResumeUpload({ awsFile, azureFile, onAwsUpload, onAzureUpload }: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Master Resumes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UploadCard label="AWS Master Resume" file={awsFile} onUpload={onAwsUpload} color="orange" />
        <UploadCard label="Azure Master Resume" file={azureFile} onUpload={onAzureUpload} color="blue" />
      </div>
    </section>
  );
}
