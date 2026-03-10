// ============================================================
// JD Fetcher — resolves job description from user inputs
// ============================================================

import axios from "axios";
import * as cheerio from "cheerio";
import type { JDFetchResult, JDResolutionResult, JobInput } from "@/types";

type CheerioRoot = ReturnType<typeof cheerio.load>;

export const AMBIGUOUS_POSTING_MESSAGE =
  "Unable to confidently identify the exact posting. Please paste the full JD text or provide a working JD link.";

const MIN_CONFIDENT_JD_LENGTH = 250;

/** Collapse whitespace and trim */
function cleanText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Strip all HTML tags */
function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

/**
 * Try to extract job posting content from JSON-LD structured data.
 * Many job boards embed schema.org/JobPosting JSON-LD on their pages.
 */
function parseJsonLdJobPostingText($: CheerioRoot): string | null {
  const collected: string[] = [];

  $('script[type="application/ld+json"]').each((_, script) => {
    const raw = $(script).contents().text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const queue: unknown[] = [...items];

      while (queue.length > 0) {
        const node = queue.shift();
        if (Array.isArray(node)) { queue.push(...node); continue; }
        if (node && typeof node === "object") {
          const obj = node as Record<string, unknown>;
          if (Array.isArray(obj["@graph"])) queue.push(...(obj["@graph"] as unknown[]));
          const type = String(obj["@type"] ?? "").toLowerCase();
          if (type.includes("jobposting")) {
            const title = typeof obj["title"] === "string" ? obj["title"] : "";
            const description = typeof obj["description"] === "string" ? obj["description"] : "";
            const responsibilities = typeof obj["responsibilities"] === "string" ? obj["responsibilities"] : "";
            const merged = cleanText([title, stripHtml(description), stripHtml(responsibilities)].filter(Boolean).join(" "));
            if (merged) collected.push(merged);
          }
        }
      }
    } catch {
      // Malformed JSON-LD — skip
    }
  });

  return collected.length > 0 ? cleanText(collected.join(" ")) : null;
}

/** Extract readable text from raw HTML, attempting JSON-LD first */
export function extractVisibleTextFromHtml(html: string): string {
  const $ = cheerio.load(html);

  // Try structured data first
  const jsonLdText = parseJsonLdJobPostingText($);
  if (jsonLdText) return jsonLdText;

  // Fall back to stripping non-content elements
  $("script, style, noscript, nav, footer, header, svg, canvas, form, iframe, aside").remove();
  return cleanText($("body").text());
}

/** Validate that a string is a proper HTTP(S) URL */
function validateHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Fetch a JD from a URL and extract visible text */
export async function fetchJdFromUrl(url: string): Promise<JDFetchResult> {
  if (!validateHttpUrl(url)) {
    return { success: false, url, message: "Invalid URL. Please paste the full JD text instead." };
  }

  try {
    const response = await axios.get<string>(url, {
      timeout: 15_000,
      maxRedirects: 5,
      responseType: "text",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ATSResumeTailor/1.0; +https://localhost)",
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const html = typeof response.data === "string" ? response.data : "";
    const extracted = extractVisibleTextFromHtml(html);

    if (extracted.length < MIN_CONFIDENT_JD_LENGTH) {
      return { success: false, url, statusCode: response.status, message: AMBIGUOUS_POSTING_MESSAGE };
    }

    return { success: true, url, statusCode: response.status, text: extracted };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) return { success: false, url, statusCode: status, message: "Job posting URL returned 404 (not found). Please paste the full JD text." };
      if (status === 401 || status === 403) return { success: false, url, statusCode: status, message: "The JD URL is restricted. Please paste the full JD text." };
      return { success: false, url, statusCode: status, message: "Unable to fetch the JD URL. Please paste the full JD text." };
    }
    return { success: false, url, message: "Unable to fetch the JD URL. Please paste the full JD text." };
  }
}

/**
 * Master resolver: given user inputs, return the JD text or an error.
 * Enforces the rule: never guess a JD from only Job ID / Company Name.
 */
export async function resolveJdInput(input: JobInput): Promise<JDResolutionResult> {
  const jdText = input.jdText?.trim();
  const jdUrl = input.jdUrl?.trim();
  const jobId = input.jobId?.trim();
  const companyName = input.companyName?.trim();

  // Best source: full JD text
  if (jdText) {
    return { success: true, source: "text", jdText, metadata: { jobId, companyName, url: jdUrl } };
  }

  // Second best: URL
  if (jdUrl) {
    const fetched = await fetchJdFromUrl(jdUrl);
    if (!fetched.success || !fetched.text) {
      return { success: false, source: "url", message: fetched.message ?? AMBIGUOUS_POSTING_MESSAGE, metadata: { jobId, companyName, url: jdUrl } };
    }
    return { success: true, source: "url", jdText: fetched.text, metadata: { jobId, companyName, url: jdUrl } };
  }

  // Only Job ID or Company Name: cannot confidently identify the posting
  if (jobId || companyName) {
    return { success: false, source: "ambiguous", message: AMBIGUOUS_POSTING_MESSAGE, metadata: { jobId, companyName } };
  }

  return { success: false, source: "none", message: "Please provide at least one job input. Full JD text or JD URL is recommended for reliable results." };
}
