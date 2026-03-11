# ATS Resume Tailor

An AI-powered web application that automatically tailors your master resume to match any job description, optimizing for Applicant Tracking Systems (ATS) to maximize your chances of getting past automated screening.

## What It Does

1. **Store multiple master resumes** — upload and organize resume variants by role, specialization, and tags
2. **Choose a role** — pick from 6 preconfigured roles (Software Developer, Data Engineer, Data Analyst, Business Analyst, QA Engineer, DevOps Engineer)
3. **Paste or provide a job description** — raw text, URL, or job ID
4. **Add custom instructions** — optionally specify skills, categories, or guidance to include
5. **Get a tailored resume** — scored against a 10-point ATS rubric with actionable recommendations to reach 10/10
6. **Download** — export in DOCX, PDF, TXT, or Markdown format

The app rewrites your resume bullets, injects missing keywords, aligns cloud technologies, and ensures your resume reads like a perfect match for the role.

## Key Features

- **Role-Specific Workspaces** — 6 dedicated role pages with role-specific guidance, sample titles, and key skills
- **Multi-Slot Resume Management** — store up to 10 resume variants on the Experience page with labels, role hints, specialization tags, and notes
- **Custom Instructions** — per-role instructions with submit/lock flow; instructions are passed to the tailoring engine and auto-cleared after generation
- **AI-Powered Tailoring** — uses OpenAI GPT-4o to intelligently rewrite and optimize resume content
- **Rule-Based Fallback** — works without an API key using a built-in rule-based tailoring engine
- **ATS Scoring Engine** — scores your tailored resume on 5 categories (2 pts each, 10 max):
  - Title Exact Match
  - Must-Have Skills Coverage
  - Responsibilities Mirrored
  - Cloud Alignment (AWS/Azure)
  - Domain Relevance & Formatting
- **Actionable Recommendations** — after scoring, the ATS report lists exactly what to add or change to reach 10/10
- **Auto-Boost Loop** — if the score is below 9/10, the app automatically re-optimizes up to 3 times
- **Cloud Detection** — automatically detects whether the JD targets AWS or Azure and selects the correct master resume
- **JD Parsing** — extracts title, must-have skills, preferred skills, responsibilities, domain keywords, and compliance terms
- **Multiple Export Formats** — download as DOCX, PDF, TXT, or Markdown with template selection
- **Persistent State** — all settings, resume slots, and per-role preferences are saved to localStorage via Zustand

## Architecture

The application runs as two processes:

| Service | Port | Description |
|---------|------|-------------|
| **Frontend (Next.js)** | 3000 | UI, API routes for tailoring/scoring/export |
| **Backend (Express)** | 4000 | File uploads, async generation jobs, output file generation, email |

The backend delegates the actual tailoring to the frontend's `/api/tailor-resume` endpoint, preserving all ATS logic in one place. The backend handles file storage, job orchestration, and multi-format output generation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 (persisted to localStorage) |
| AI | OpenAI GPT-4o (via `openai` SDK) |
| Backend | Express 5, TypeScript, multer 2 |
| Resume Parsing | Mammoth (DOCX extraction) |
| Export | `docx` (DOCX), `pdf-lib` (PDF), plain text, Markdown |
| JD Fetching | Axios + Cheerio (URL scraping) |
| Validation | Zod |

## Project Structure

```
ats-resume-tailor/                  # Frontend (Next.js)
├── app/
│   ├── api/
│   │   ├── analyze-jd/             # Parse & analyze a job description
│   │   ├── tailor-resume/          # Full tailoring pipeline (main endpoint)
│   │   ├── generate-docx/          # Export tailored resume as DOCX
│   │   └── generate-pdf/           # Export tailored resume as PDF
│   ├── experience/page.tsx         # Multi-slot resume management
│   ├── settings/page.tsx           # Global settings (template, formats)
│   ├── roles/
│   │   ├── software-developer/     # Role-specific generation page
│   │   ├── data-engineer/
│   │   ├── data-analyst/
│   │   ├── business-analyst/
│   │   ├── qa-engineer/
│   │   └── devops-engineer/
│   ├── page.tsx                    # Dashboard (navigation hub)
│   └── layout.tsx                  # Sidebar layout
├── components/
│   ├── workspace/
│   │   ├── RoleWorkspaceShell.tsx   # Reusable role generation shell
│   │   ├── ResumeSlotSelector.tsx   # Resume slot picker
│   │   └── CustomInstructionsBox.tsx # Per-role instructions
│   ├── forms/
│   │   ├── TemplateSelector.tsx     # Template picker
│   │   └── FormatSelector.tsx       # Output format picker
│   ├── progress/
│   │   └── GenerationProgress.tsx   # Step-by-step progress display
│   ├── layout/Sidebar.tsx           # Navigation sidebar
│   ├── JobInputForm.tsx             # JD input (text/URL)
│   ├── ResultsPanel.tsx             # Tailored resume output
│   ├── ATSReportPanel.tsx           # ATS score + recommendations
│   ├── ResumePreview.tsx            # Live resume preview
│   └── ErrorAlert.tsx
├── lib/
│   ├── openaiClient.ts             # GPT-4o integration & prompts
│   ├── resumeTailor.ts             # Rule-based tailoring engine
│   ├── atsScorer.ts                # ATS scoring rubric + recommendations
│   ├── jdParser.ts                 # JD text parsing
│   ├── jdFetcher.ts                # Fetch JD from URL
│   ├── cloudDetector.ts            # AWS vs Azure detection
│   ├── resumeExtractor.ts          # DOCX resume parsing (broadened heading detection)
│   ├── apiClient.ts                # HTTP client for backend API
│   ├── roles.ts                    # Role definitions & config
│   ├── templates.ts                # Resume template definitions
│   ├── outputFormats.ts            # Output format definitions
│   ├── endpoints.ts                # API endpoint constants
│   └── validations.ts              # Input validation schemas
├── store/
│   ├── useResumeSlotStore.ts        # Multi-slot resume storage (Zustand)
│   ├── useProfileStore.ts           # Upload ID persistence
│   └── useAppSettingsStore.ts       # Global settings persistence
├── hooks/
│   ├── usePersistedResumeSlots.ts   # Hydration-safe resume slot hook
│   ├── usePersistedProfile.ts       # Hydration-safe profile hook
│   └── usePersistedSettings.ts      # Hydration-safe settings hook
├── types/index.ts                   # TypeScript type definitions
└── .env.local                       # OpenAI API key (not committed)
```

```
ats-resume-server/                  # Backend (Express)
├── src/
│   ├── server.ts                    # Entry point
│   ├── app.ts                       # Express app setup
│   ├── controllers/
│   │   ├── resumeController.ts      # Generation endpoints
│   │   ├── uploadController.ts      # File upload endpoints
│   │   ├── jdController.ts          # JD resolution endpoints
│   │   ├── profileController.ts     # Profile management
│   │   ├── settingsController.ts    # Settings endpoints
│   │   └── emailController.ts       # Email endpoints
│   ├── routes/                      # Express route definitions
│   ├── services/
│   │   ├── resumeGenerationService.ts # Async job orchestrator
│   │   ├── generationStatusService.ts # Job status tracking
│   │   ├── uploadService.ts           # File storage
│   │   ├── docxGeneratorService.ts    # DOCX output
│   │   ├── pdfGeneratorService.ts     # PDF output
│   │   ├── textGeneratorService.ts    # Plain text output
│   │   ├── markdownGeneratorService.ts # Markdown output
│   │   └── emailService.ts           # Email delivery
│   └── types/index.ts               # Server type definitions
└── data/uploads/                    # Uploaded resume files
```

## Getting Started

### Prerequisites

- Node.js 18+ (tested with Node.js 24)
- An OpenAI API key (optional — rule-based mode works without it)

### Installation

```bash
# Clone the frontend
git clone https://github.com/17Khadar/ats-resume-tailor.git
cd ats-resume-tailor
npm install

# Clone the backend (separate repo)
cd ..
git clone https://github.com/17Khadar/ats-resume-server.git
cd ats-resume-server
npm install
```

### Configuration

Create a `.env.local` file in the `ats-resume-tailor` root:

```
OPENAI_API_KEY=your-openai-api-key-here
```

### Running the Application

You need **two terminals** — one for each service:

**Terminal 1 — Backend (port 4000):**
```bash
cd ats-resume-server
npx tsx src/server.ts
```

**Terminal 2 — Frontend (port 3000):**
```bash
cd ats-resume-tailor
npx next dev --port 3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Troubleshooting:** If you get `EADDRINUSE` errors, a stale process is holding the port. On Windows PowerShell:
> ```powershell
> Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
>   Where-Object { $_.OwningProcess -ne 0 } |
>   Select-Object -ExpandProperty OwningProcess -Unique |
>   ForEach-Object { Stop-Process -Id $_ -Force }
> ```

### Build for Production

```bash
cd ats-resume-tailor
npm run build
npm start
```

## How It Works

### Generation Pipeline

```
User selects resume slot + enters JD + (optional) custom instructions
    │
    ▼
Frontend → Backend API (/api/resume/generate)
    │
    ├── 1. Resolve JD (text, URL, or job ID)
    ├── 2. Validate resume source (uploaded file)
    │
    ▼
Backend → Frontend API (/api/tailor-resume)
    │
    ├── 3. Parse JD → extract must-haves, preferred, responsibilities
    ├── 4. Detect cloud dominance (AWS vs Azure)
    ├── 5. Extract master resume sections (summary, skills, experience, education)
    ├── 6. Tailor resume (AI or rule-based + custom instructions)
    ├── 7. Score against ATS rubric (10-point scale)
    ├── 8. Auto-boost if score < 9 (up to 3 passes)
    ├── 9. Generate actionable recommendations
    │
    ▼
Backend generates output files (DOCX/PDF/TXT/MD)
    │
    ▼
User downloads files + reviews ATS report + recommendations
```

### Custom Instructions Flow

1. Type instructions in the Custom Instructions box on any role page
2. Click **Submit Instructions** to lock them (editing resets the lock)
3. Instructions are passed through the full pipeline:
   - **AI path**: appended to the GPT-4o prompt as additional user guidance
   - **Rule-based path**: skill-like lines (e.g., `Programming Languages: Python, SQL`) are parsed and merged into existing skill categories
4. After successful generation, instructions are automatically cleared

### ATS Scoring & Recommendations

The ATS Strategy Report scores your resume on 5 categories (2 points each):

| Category | What It Checks |
|----------|---------------|
| Title Exact Match | Resume title matches JD title word-for-word |
| Must-Have Skills | JD skills appear in both Skills section and Experience bullets |
| Responsibilities Mirrored | JD responsibilities reflected in experience bullets |
| Cloud Alignment | Dominant cloud keywords present throughout resume |
| Domain & Formatting | Domain/compliance keywords included, ATS-safe formatting |

For any category scoring below 2/2, the report generates specific recommendations listing exactly which keywords, skills, or responsibilities to add.

## Scope & Limitations

- **Supported resume format**: DOCX only (no PDF upload yet)
- **Target domains**: optimized for Software Development, Data Engineering, Data Analysis, Business Analysis, QA, and DevOps roles
- **Cloud platforms**: AWS and Azure detection and alignment (GCP support is minimal)
- **Language**: English only
- **AI dependency**: best results require a valid OpenAI API key; rule-based fallback produces functional but less polished output
- **Local storage**: resume slots and settings are persisted in the browser's localStorage

## License

Private project — not licensed for redistribution.
