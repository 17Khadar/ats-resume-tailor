# ATS Resume Tailor

An AI-powered web application that automatically tailors your master resume to match any job description, optimizing for Applicant Tracking Systems (ATS) to maximize your chances of getting past automated screening.

## What It Does

1. **Upload your master resume** (supports `.docx` format)
2. **Paste or provide a job description** (raw text or URL)
3. **Get a tailored resume** that mirrors the JD's exact terminology, skills, and responsibilities — scored against a 10-point ATS rubric

The app rewrites your resume bullets, injects missing keywords, aligns cloud technologies, and ensures your resume reads like a perfect match for the role.

## Key Features

- **AI-Powered Tailoring** — Uses OpenAI GPT-4o to intelligently rewrite and optimize resume content
- **ATS Scoring Engine** — Scores your tailored resume on 5 categories (2 pts each, 10 max):
  - Title Exact Match
  - Must-Have Skills Coverage
  - Responsibilities Mirrored
  - Cloud Alignment (AWS/Azure)
  - Domain Relevance & Formatting
- **Auto-Boost Loop** — If the score is below 9/10, the app automatically re-optimizes up to 3 times
- **Cloud Detection** — Automatically detects whether the JD targets AWS or Azure and aligns your resume accordingly
- **JD Parsing** — Extracts title, must-have skills, preferred skills, responsibilities, domain keywords, and compliance terms from raw JD text
- **Export Options** — Download your tailored resume as DOCX or PDF
- **Rule-Based Fallback** — Works without an API key using a built-in rule-based tailoring engine

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 |
| AI | OpenAI GPT-4o (via `openai` SDK) |
| Resume Parsing | Mammoth (DOCX extraction) |
| Export | `docx` (DOCX generation), `pdf-lib` (PDF generation) |
| JD Fetching | Axios + Cheerio (URL scraping) |
| Validation | Zod |

## Project Structure

```
ats-resume-tailor/
├── app/
│   ├── api/
│   │   ├── analyze-jd/       # Parse & analyze a job description
│   │   ├── tailor-resume/    # Full tailoring pipeline (main endpoint)
│   │   ├── generate-docx/    # Export tailored resume as DOCX
│   │   └── generate-pdf/     # Export tailored resume as PDF
│   ├── page.tsx              # Main UI
│   └── layout.tsx
├── components/
│   ├── MasterResumeUpload.tsx  # Resume file upload
│   ├── JobInputForm.tsx        # JD input (text/URL)
│   ├── ResultsPanel.tsx        # Tailored resume output
│   ├── ResumePreview.tsx       # Live resume preview
│   ├── ATSReportPanel.tsx      # ATS score breakdown
│   ├── Header.tsx
│   ├── LoadingOverlay.tsx
│   └── ErrorAlert.tsx
├── lib/
│   ├── openaiClient.ts       # GPT-4o integration & prompts
│   ├── resumeTailor.ts       # Rule-based tailoring engine
│   ├── atsScorer.ts          # ATS scoring rubric
│   ├── jdParser.ts           # JD text parsing
│   ├── jdFetcher.ts          # Fetch JD from URL
│   ├── cloudDetector.ts      # AWS vs Azure detection
│   ├── resumeExtractor.ts    # DOCX resume parsing
│   ├── docxGenerator.ts      # DOCX export
│   ├── pdfGenerator.ts       # PDF export
│   └── validations.ts        # Input validation schemas
├── types/
│   └── index.ts              # TypeScript type definitions
└── .env.local                # OpenAI API key (not committed)
```

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key (optional — rule-based mode works without it)

### Installation

```bash
git clone https://github.com/17Khadar/ats-resume-tailor.git
cd ats-resume-tailor
npm install
```

### Configuration

Create a `.env.local` file in the project root:

```
OPENAI_API_KEY=your-openai-api-key-here
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Deployment

The easiest way to deploy is on **Vercel**:

1. Push your code to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add `OPENAI_API_KEY` in Environment Variables
4. Deploy

## Scope & Limitations

- **Supported resume format**: DOCX only (no PDF upload yet)
- **Target domains**: Optimized for Data Engineering, Cloud Engineering, and DevOps roles
- **Cloud platforms**: AWS and Azure detection and alignment (GCP support is minimal)
- **Language**: English only
- **AI dependency**: Best results require a valid OpenAI API key; rule-based fallback produces functional but less polished output

## License

Private project — not licensed for redistribution.
