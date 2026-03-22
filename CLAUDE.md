# Syncloop — AI Video Subtitle Generator

## What is this?

Web app that generates intelligent subtitles for videos using AI vision models (GPT-4o analyzes video frames visually, not audio). Optionally syncs with AI-generated voice (ElevenLabs). Supports 5-20 min videos.

## Current State (Step 1.3 complete + Landing Page)

MVP Phase 1, Steps 1.1, 1.2, and 1.3 are done. Landing page added.

### What works now:
- **Landing page** with hero, how-it-works, features, FAQ, CTA, footer
- Landing page has Framer Motion animations (scroll reveals, staggered entrances, hover effects)
- Create/list/view/delete projects via API and UI
- Upload video files (MP4, WebM, MOV, AVI)
- Extract video metadata via FFprobe (duration, resolution, fps)
- Stream video playback with range request support
- Video preview in project detail page
- Frame extraction via FFmpeg (every 2-3s)
- Frame listing and serving API
- **AI subtitle generation via Vercel AI Gateway** (GPT-4o analyzes frames visually, generates time-aligned subtitles)
- **Generate/regenerate subtitles UI** with loading states and error handling
- i18n support (EN/ES/PT) with browser language detection
- Theme toggle (dark/light) with system preference detection

### What's next (remaining MVP steps):
- **Step 1.4**: Video player with subtitle overlay + editing
- **Step 1.5**: Basic export (FFmpeg drawtext)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS 4, Framer Motion
- **Backend**: Next.js API Routes (no separate server)
- **Database**: PostgreSQL 16 (Docker) + Drizzle ORM
- **AI**: Vercel AI SDK v6 (`ai` package) + AI Gateway → OpenAI GPT-4o (vision, single-call frame analysis)
- **Video**: FFmpeg/FFprobe via fluent-ffmpeg
- **Validation**: Zod
- **Font**: Inter (via next/font)
- **Storage**: Local filesystem (`/uploads/`)

## Project Structure

```
syncloop/
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Root layout (Inter font, providers)
│   │   ├── nav-bar.tsx                    # Navigation bar (context-aware: landing vs app)
│   │   ├── page.tsx                       # Landing page (hero, features, FAQ, CTA)
│   │   ├── icon.svg                       # Favicon (video + subtitles icon)
│   │   ├── globals.css                    # Tailwind + theme tokens
│   │   ├── dashboard/
│   │   │   └── page.tsx                   # Project list page
│   │   ├── projects/
│   │   │   ├── new/page.tsx               # Create project + upload form
│   │   │   └── [id]/page.tsx              # Project detail + video player
│   │   └── api/
│   │       ├── projects/
│   │       │   ├── route.ts               # POST (create) + GET (list)
│   │       │   └── [id]/
│   │       │       ├── route.ts           # GET (detail) + PATCH + DELETE
│   │       │       ├── upload/route.ts    # POST (video upload + ffprobe)
│   │       │       ├── extract-frames/route.ts  # POST (FFmpeg frame extraction)
│   │       │       ├── generate-subtitles/route.ts  # POST (AI Gateway subtitle generation)
│   │       │       └── frames/
│   │       │           ├── route.ts       # GET (list extracted frames)
│   │       │           └── [filename]/route.ts  # GET (serve frame image)
│   │       └── videos/
│   │           └── [id]/route.ts          # GET (stream video with range)
│   ├── db/
│   │   ├── schema.ts                      # Drizzle schema: projects, videos, subtitles
│   │   └── index.ts                       # DB connection pool
│   └── lib/
│       ├── ffmpeg.ts                      # Frame extraction with FFmpeg
│       ├── ffprobe.ts                     # Video metadata extraction
│       ├── format.ts                      # Duration/filesize formatters
│       ├── i18n.ts                        # Internationalization strings (EN/ES/PT)
│       ├── i18n-context.tsx               # i18n React context provider
│       └── theme-context.tsx              # Theme toggle context provider
├── uploads/                               # Video files (gitignored)
├── drizzle.config.ts                      # Drizzle Kit config
├── docker-compose.yml                     # PostgreSQL 16
├── specs/                                 # Feature specs per step
│   └── step-1.3-ai-subtitle-generation.md
├── plan.md                                # Full technical specification
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── next.config.mjs
└── .env.local                             # DATABASE_URL, AI_GATEWAY_API_KEY
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing page (public marketing) |
| `/dashboard` | Project list (app) |
| `/projects/new` | Create project + upload video |
| `/projects/[id]` | Project detail + video player + subtitles |

## Database Schema

```
projects:  id, title, status, template, language, created_at, updated_at
videos:    id, project_id (FK), file_name, file_path, file_size, mime_type,
           duration, width, height, fps, created_at
subtitles: id, project_id (FK), index, start_time, end_time, text, source,
           created_at, updated_at
```

## Commands

```bash
docker compose up -d          # Start PostgreSQL
npm run dev                   # Start dev server (port 3000)
npm run db:push               # Push schema changes to DB
npm run db:studio             # Open Drizzle Studio
npm run build                 # Production build
```

## Environment Variables

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/syncloop
AI_GATEWAY_API_KEY=<your-key>  # Vercel AI Gateway key for AI subtitle generation
```

## Key Decisions

- **No BullMQ/workers in MVP** — all processing is synchronous (FFmpeg, AI calls)
- **No S3** — files stored locally in `/uploads/`
- **No chunked uploads** — simple FormData multipart
- **Next.js API routes** instead of Fastify — simpler for MVP
- **Zod v4** for validation (import from `zod/v4`)
- Video streaming uses range requests for seeking support
- **Vercel AI SDK v6 + AI Gateway** for subtitle generation — uses `generateText` from `ai` with `openai/gpt-4o` model string, frames sent as base64 images, max 60 per call (evenly sampled)
- **Inter font** via `next/font/google` (zero layout shift)
- **Framer Motion** (`motion` package) for landing page animations

## Conventions

- All API routes return JSON
- Error responses: `{ error: "message" }`
- Project statuses: draft → uploaded → frames_extracted → analyzing → ready → (future: exporting, complete)
- Timestamps are ISO strings from PostgreSQL
- File paths are absolute on disk
- Navbar is context-aware: shows "Dashboard" on landing, "New Project" on app pages
- Landing page sections use `Reveal` component for scroll-triggered animations
