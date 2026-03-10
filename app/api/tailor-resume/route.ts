// ============================================================
// API: /api/tailor-resume — full pipeline: resolve JD, parse,
// detect cloud, extract master, tailor, score, return results
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { resolveJdInput } from "@/lib/jdFetcher";
import { parseJD } from "@/lib/jdParser";
import { detectCloudDominance } from "@/lib/cloudDetector";
import { extractResumeFromDocx } from "@/lib/resumeExtractor";
import { tailorResume, boostResumeScore } from "@/lib/resumeTailor";
import { generateATSReport } from "@/lib/atsScorer";
import { aiTailorResume, aiBoostResume, isAIEnabled } from "@/lib/openaiClient";
import type { ErrorResponse, MasterResumeType, TailorResumeResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();

    const jobId = formData.get("jobId") as string | null;
    const companyName = formData.get("companyName") as string | null;
    const jdUrl = formData.get("jdUrl") as string | null;
    const jdText = formData.get("jdText") as string | null;
    const awsFile = formData.get("awsMaster") as File | null;
    const azureFile = formData.get("azureMaster") as File | null;

    // Validate at least one input
    if (!jobId?.trim() && !companyName?.trim() && !jdUrl?.trim() && !jdText?.trim()) {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: "Please provide at least one job input.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Check at least one master resume is uploaded
    if (!awsFile && !azureFile) {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: "Please upload at least one master resume (AWS or Azure).", code: "MISSING_MASTER_RESUME" },
        { status: 400 }
      );
    }

    // ── Step 1: Resolve JD ──
    const resolution = await resolveJdInput({
      jobId: jobId || undefined,
      companyName: companyName || undefined,
      jdUrl: jdUrl || undefined,
      jdText: jdText || undefined,
    });

    if (!resolution.success || !resolution.jdText) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: resolution.message || "Could not retrieve JD.",
          code: resolution.source === "ambiguous" ? "JD_AMBIGUOUS" : "JD_RETRIEVAL_ERROR",
        },
        { status: 422 }
      );
    }

    // ── Step 2: Parse JD ──
    const parsedJD = parseJD(resolution.jdText);

    // ── Step 3: Detect cloud type ──
    const cloudDetection = detectCloudDominance(resolution.jdText);

    // ── Step 4: Select master ──
    let selectedMaster: MasterResumeType;
    let masterFile: File;

    if (cloudDetection.cloudType === "aws" && awsFile) {
      selectedMaster = "aws";
      masterFile = awsFile;
    } else if (cloudDetection.cloudType === "azure" && azureFile) {
      selectedMaster = "azure";
      masterFile = azureFile;
    } else if (awsFile && !azureFile) {
      // Only AWS uploaded — use it regardless
      selectedMaster = "aws";
      masterFile = awsFile;
    } else if (azureFile && !awsFile) {
      // Only Azure uploaded — use it regardless
      selectedMaster = "azure";
      masterFile = azureFile;
    } else if (cloudDetection.cloudType === "aws" && !awsFile && azureFile) {
      // JD is AWS but only Azure master available
      return NextResponse.json<ErrorResponse>(
        { success: false, error: "JD is AWS-focused but only Azure master resume is uploaded. Please upload an AWS master resume.", code: "MISSING_MASTER_RESUME" },
        { status: 400 }
      );
    } else if (cloudDetection.cloudType === "azure" && !azureFile && awsFile) {
      // JD is Azure but only AWS master available
      return NextResponse.json<ErrorResponse>(
        { success: false, error: "JD is Azure-focused but only AWS master resume is uploaded. Please upload an Azure master resume.", code: "MISSING_MASTER_RESUME" },
        { status: 400 }
      );
    } else {
      // Fallback: use whichever is available
      selectedMaster = awsFile ? "aws" : "azure";
      masterFile = awsFile || azureFile!;
    }

    // ── Step 5: Extract master resume content ──
    const arrayBuffer = await masterFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const masterResume = await extractResumeFromDocx(buffer);

    // ── Step 6: Tailor resume (AI-powered if API key available, otherwise rule-based) ──
    let resume: import("@/types").ResumeSectionOutput;
    let learnableSkillsAdded: string[] = [];
    let placeholdersUsed: string[] = [];

    if (isAIEnabled()) {
      // Try AI-powered tailoring first
      const aiResume = await aiTailorResume(masterResume, parsedJD, cloudDetection);
      if (aiResume) {
        resume = aiResume;
        // Track which skills were added (compare master vs tailored)
        const masterSkillsLower = (masterResume.sections.skills || "").toLowerCase();
        learnableSkillsAdded = [...parsedJD.mustHaves, ...parsedJD.preferred]
          .filter((kw) => !masterSkillsLower.includes(kw.toLowerCase()))
          .filter((kw) => aiResume.skills.join(" ").toLowerCase().includes(kw.toLowerCase()));
      } else {
        // AI failed, fall back to rule-based
        const result = tailorResume(masterResume, parsedJD, cloudDetection);
        resume = result.resume;
        learnableSkillsAdded = result.learnableSkillsAdded;
        placeholdersUsed = result.placeholdersUsed;
      }
    } else {
      // No API key — use rule-based tailoring
      const result = tailorResume(masterResume, parsedJD, cloudDetection);
      resume = result.resume;
      learnableSkillsAdded = result.learnableSkillsAdded;
      placeholdersUsed = result.placeholdersUsed;
    }

    // ── Step 7: Generate ATS report ──
    let report = generateATSReport(
      resolution.source,
      parsedJD,
      cloudDetection,
      selectedMaster,
      masterResume,
      resume,
      learnableSkillsAdded,
      placeholdersUsed
    );

    // ── Step 8: Auto-correct until ATS score >= 9 (max 3 passes) ──
    const ATS_TARGET = 9;
    const MAX_BOOST_PASSES = 3;

    for (let pass = 0; pass < MAX_BOOST_PASSES && report.atsScore < ATS_TARGET; pass++) {
      if (isAIEnabled()) {
        // Identify weak categories for targeted AI fix
        const weakCategories: string[] = [];
        const rb = report.rubricBreakdown;
        if (rb.titleExactMatch.score < 2) weakCategories.push(rb.titleExactMatch.category);
        if (rb.mustHaveCoverage.score < 2) weakCategories.push(rb.mustHaveCoverage.category);
        if (rb.responsibilitiesMirrored.score < 2) weakCategories.push(rb.responsibilitiesMirrored.category);
        if (rb.cloudAlignment.score < 2) weakCategories.push(rb.cloudAlignment.category);
        if (rb.domainAndFormatting.score < 2) weakCategories.push(rb.domainAndFormatting.category);

        const aiBoosted = await aiBoostResume(resume, parsedJD, cloudDetection, weakCategories);
        if (aiBoosted) {
          resume = aiBoosted;
        } else {
          resume = boostResumeScore(resume, parsedJD, cloudDetection, report.rubricBreakdown);
        }
      } else {
        resume = boostResumeScore(resume, parsedJD, cloudDetection, report.rubricBreakdown);
      }

      report = generateATSReport(
        resolution.source,
        parsedJD,
        cloudDetection,
        selectedMaster,
        masterResume,
        resume,
        learnableSkillsAdded,
        placeholdersUsed
      );
    }

    const response: TailorResumeResponse = {
      success: true,
      parsedJD,
      selectedMaster,
      cloudDetection,
      resume,
      report,
      contactInfo: masterResume.contactInfo,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("tailor-resume error:", err);
    return NextResponse.json<ErrorResponse>(
      { success: false, error: "Internal server error during resume tailoring.", code: "GENERATION_ERROR" },
      { status: 500 }
    );
  }
}
