// ============================================================
// API: /api/generate-pdf — generates and returns a PDF file
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { generatePdfBuffer } from "@/lib/pdfGenerator";
import { z } from "zod";
import type { ContactInfo, ResumeSectionOutput } from "@/types";

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
    const contactInfo = (parsed.data.contactInfo ?? {
      name: "", email: "", phone: "", linkedin: "", location: "",
    }) as ContactInfo;

    const pdfBytes = await generatePdfBuffer(resume, contactInfo);

    return new NextResponse(Buffer.from(pdfBytes) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Tailored_Resume.pdf"`,
      },
    });
  } catch (err) {
    console.error("generate-pdf error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate PDF file." },
      { status: 500 }
    );
  }
}
