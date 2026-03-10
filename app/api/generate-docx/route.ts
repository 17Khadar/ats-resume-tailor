// ============================================================
// API: /api/generate-docx — generates and returns a DOCX file
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { generateDocxBuffer } from "@/lib/docxGenerator";
import { z } from "zod";
import type { ATSReport, ContactInfo, ResumeSectionOutput } from "@/types";

// Lightweight schema just to confirm shape
const bodySchema = z.object({
  resume: z.object({
    title: z.string(),
    summary: z.string(),
    skills: z.array(z.string()),
    workExperience: z.array(z.object({
      role: z.string(),
      company: z.string(),
      duration: z.string(),
      bullets: z.array(z.string()),
    })),
    education: z.array(z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string().optional(),
    })),
    atsStrategy: z.array(z.string()),
  }),
  report: z.any(),
  contactInfo: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    linkedin: z.string(),
    location: z.string(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const resume = parsed.data.resume as ResumeSectionOutput;
    const report = parsed.data.report as ATSReport;
    const contactInfo = (parsed.data.contactInfo ?? { name: "", email: "", phone: "", linkedin: "", location: "" }) as ContactInfo;

    const buffer = await generateDocxBuffer(resume, report, contactInfo);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Tailored_Resume.docx"`,
      },
    });
  } catch (err) {
    console.error("generate-docx error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate DOCX file." },
      { status: 500 }
    );
  }
}
