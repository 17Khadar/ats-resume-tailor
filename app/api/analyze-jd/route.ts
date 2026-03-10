// ============================================================
// API: /api/analyze-jd — resolve and parse a job description
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { resolveJdInput } from "@/lib/jdFetcher";
import { parseJD } from "@/lib/jdParser";
import { detectCloudDominance } from "@/lib/cloudDetector";
import { z } from "zod";
import type { ErrorResponse } from "@/types";

const bodySchema = z.object({
  jobId: z.string().optional(),
  companyName: z.string().optional(),
  jdUrl: z.string().optional(),
  jdText: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: "Invalid request body.", code: "VALIDATION_ERROR", details: parsed.error.message },
        { status: 400 }
      );
    }

    // Step 1: Resolve JD text
    const resolution = await resolveJdInput(parsed.data);

    if (!resolution.success || !resolution.jdText) {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: resolution.message || "Could not retrieve JD.", code: resolution.source === "ambiguous" ? "JD_AMBIGUOUS" : "JD_RETRIEVAL_ERROR" },
        { status: 422 }
      );
    }

    // Step 2: Parse JD
    const jd = parseJD(resolution.jdText);

    // Step 3: Detect cloud type
    const cloud = detectCloudDominance(resolution.jdText);

    return NextResponse.json({
      success: true,
      jdSource: resolution.source,
      parsedJD: jd,
      cloudDetection: cloud,
    });
  } catch (err) {
    console.error("analyze-jd error:", err);
    return NextResponse.json<ErrorResponse>(
      { success: false, error: "Internal server error during JD analysis.", code: "PARSING_ERROR" },
      { status: 500 }
    );
  }
}
