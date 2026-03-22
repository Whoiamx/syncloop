# Technical Specification: Syncloop — AI Video Subtitle Generator

## Context

Build a web application that generates intelligent subtitles for videos using AI vision models (analyzing visual content, not just audio) and optionally synchronizes them with AI-generated voice (ElevenLabs). The system must support 5-20 minute videos, offer template-driven subtitle generation (Tutorial / Product Demo), and provide a rich editor for customizing subtitles before export.

---

## 1. System Architecture

**Pattern**: Modular monolith backend with async worker separation. Practical for initial build, decomposable to microservices later.

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                     │
│  Upload │ Context Config │ Subtitle Editor │ Export          │
│                   SSE for real-time progress                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS + SSE
┌──────────────────────▼──────────────────────────────────────┐
│              API SERVER (Fastify + TypeScript)               │
│     Upload │ Project │ Analysis │ Subtitle │ Voice │ Export  │
└──────┬──────────┬──────────────┬────────────────────────────┘
       │          │              │
┌──────▼──────────▼──────────────▼────────────────────────────┐
│                  JOB QUEUE (BullMQ / Redis)                  │
│   Video Ingest  │  AI Analysis Pipeline  │  Export/Render    │
└──────┬──────────────────┬───────────────────────┬───────────┘
       │                  │                       │
  ┌────▼────┐  ┌──────────▼──────────┐   ┌───────▼──────────┐
  │   S3    │  │  AI Providers       │   │  FFmpeg Workers   │
  │ Storage │  │  GPT-4o / Gemini /  │   │  (video encode)   │
  │         │  │  Claude / ElevenLabs│   │                   │
  └─────────┘  └─────────────────────┘   └──────────────────┘
                                               │
                                       ┌───────▼───────┐
                                       │  PostgreSQL   │
                                       │  + Redis      │
                                       └───────────────┘
```

---

## 2. Module Breakdown

### Frontend Modules

| Module | Responsibility |
|--------|---------------|
| `upload/` | Drag-and-drop with chunked upload (tus protocol), progress, file validation (format, duration ≤20min, size) |
| `recorder/` | Screen recording via MediaRecorder API, preview, save-to-project |
| `context-config/` | Project title, template selection (Tutorial / Product Demo), voice config |
| `editor/` | Video player + canvas subtitle overlay, subtitle list editor, timeline, typography panel, animation config, trim controls, annotation tools |
| `export/` | Quality selection, export trigger, download progress |

### Backend Service Modules

| Service | Responsibility |
|---------|---------------|
| `upload-service` | Chunked uploads (tus-node-server), video validation, S3 storage, FFprobe metadata extraction |
| `project-service` | Project CRUD, state machine (draft → processing → ready → exporting → complete) |
| `analysis-service` | AI vision pipeline: frame extraction, batching, template prompts, API calls, response parsing |
| `subtitle-service` | Subtitle CRUD, timing validation, merge/split operations |
| `voice-service` | ElevenLabs integration: voice listing, TTS per segment, audio stitching |
| `export-service` | FFmpeg rendering: burn subtitles + mix voice audio, multiple quality outputs |
| `job-orchestrator` | BullMQ job definitions, progress reporting, retry logic, dead letter handling |

---

## 3. Data Flow (Upload to Export)

```
Step 1: UPLOAD
  Client ──chunked upload──▶ tus endpoint ──▶ S3(raw/)
  Client ──POST /projects──▶ DB (project record)

Step 2: INGEST (async job: video.ingest)
  Worker: FFprobe extracts metadata (duration, resolution, fps, codec)
  Worker: FFmpeg generates thumbnail
  Emits SSE: ingest.complete

Step 3: CONFIGURE
  Client ──PUT /projects/:id/config──▶ { title, template, voice settings }

Step 4: ANALYZE (async job: video.analyze)
  4a: Frame extraction — FFmpeg @ 1fps (20min = ~1,200 frames) → S3(frames/)
  4b: Batching — Group into 10-second segments (10 frames each, 120 batches)
  4c: Phase 1 — AI Vision per batch (concurrency: 5) → segment descriptions
  4d: Phase 2 — All descriptions → single AI call → time-aligned subtitles
  Emits SSE: analysis.progress + analysis.complete

Step 5: VOICE (optional, async job: voice.generate)
  For each subtitle: ElevenLabs TTS → audio chunk → S3(audio/)
  Stitch chunks with silence gaps → combined audio
  Emits SSE: voice.complete

Step 6: EDIT
  Client loads subtitles + signed video URL
  Edits via PATCH/PUT endpoints
  Annotations, trim, styling all saved to DB

Step 7: EXPORT (async job: video.export)
  7a: Generate ASS subtitle file (with styling + animations)
  7b: FFmpeg composite: video + subtitles + voice audio
  7c: Output → S3(exports/)
  Emits SSE: export.complete + downloadUrl

Step 8: DOWNLOAD
  Client ──GET /export/download──▶ signed S3 URL redirect
```

---

## 4. API Contracts

### Projects
```
POST   /api/v1/projects                    → { id, title, status }
GET    /api/v1/projects/:id                → full project with video metadata
PUT    /api/v1/projects/:id/config         → { template, voiceEnabled, voiceId, language }
DELETE /api/v1/projects/:id
```

### Upload
```
POST   /api/v1/upload/init                 → { uploadUrl (tus), uploadId }
POST   /api/v1/projects/:id/upload/complete → { jobId }
```

### Analysis
```
POST   /api/v1/projects/:id/analyze        → { jobId }
  Body: { provider?: "openai"|"google"|"anthropic", frameRate?: number }
GET    /api/v1/projects/:id/analyze/status  → { status, progress, framesAnalyzed, totalFrames }
```

### Subtitles
```
GET    /api/v1/projects/:id/subtitles      → { subtitles: SubtitleSegment[] }
PATCH  /api/v1/projects/:id/subtitles/:sid → update text, timing, style
PUT    /api/v1/projects/:id/subtitles      → bulk replacement
DELETE /api/v1/projects/:id/subtitles/:sid
POST   /api/v1/projects/:id/subtitles/:sid/split → { splitTime } → [Subtitle, Subtitle]
```

### Voice
```
GET    /api/v1/voices                      → { voices: [{ id, name, previewUrl, language }] }
POST   /api/v1/projects/:id/voice/generate → { jobId }
GET    /api/v1/projects/:id/voice/status   → { status, progress, segmentsComplete }
GET    /api/v1/projects/:id/voice/audio    → redirect to signed S3 URL
```

### Annotations
```
POST   /api/v1/projects/:id/annotations   → { type, time, duration, data: {x,y,width,height,label,color} }
GET    /api/v1/projects/:id/annotations
DELETE /api/v1/projects/:id/annotations/:aid
```

### Export
```
POST   /api/v1/projects/:id/export         → { quality: "1080p"|"720p"|"480p", includeVoice }
GET    /api/v1/projects/:id/export/status   → { status, progress }
GET    /api/v1/projects/:id/export/download → redirect to signed S3 URL
```

### SSE (real-time progress)
```
GET    /api/v1/projects/:id/events         → text/event-stream
  Events: ingest.complete, analysis.progress, analysis.complete,
          voice.progress, voice.complete, export.progress, export.complete, error
```

---

## 5. Video Analysis Pipeline

### Frame Sampling
- **Rate**: 1 frame/second (adaptive with scene-change detection)
- **20min video** = ~1,200-1,800 frames
- **FFmpeg**: `ffmpeg -i input.mp4 -vf "fps=1,scale=768:-1" -q:v 3 frame_%05d.jpg`
- **Storage**: ~40-80KB per frame, ~60-96MB total per project

### Two-Phase Analysis

**Phase 1 — Visual Description (parallelized, concurrency: 5)**
- 120 batches of 10 frames (10-second segments)
- Each batch → AI Vision API → structured JSON description
- ~8,100 input tokens + ~200 output tokens per batch

**Phase 2 — Subtitle Synthesis (single call)**
- All 120 segment descriptions assembled (~24K tokens)
- Template-specific prompt generates time-aligned subtitles
- Within 128K context window of modern models

### Cost Estimates
| Provider | Cost per 20min video |
|----------|---------------------|
| GPT-4o (primary) | ~$2.70 |
| Gemini 2.0 Flash (budget) | ~$0.40 |
| Claude Sonnet (premium) | ~$3.00 |

### Provider Strategy
- **Primary**: GPT-4o — best UI/action recognition
- **Budget fallback**: Gemini 2.0 Flash — 3-5x faster, 6x cheaper
- **Premium**: Claude Sonnet — complex/ambiguous content
- **Retry**: 3 attempts with exponential backoff (2s, 4s, 8s); skip + interpolate on persistent failure

---

## 6. Subtitle Data Structure

```typescript
interface SubtitleSegment {
  id: string;                          // UUID
  index: number;
  startTime: number;                   // seconds with ms precision
  endTime: number;
  text: string;                        // max 500 chars
  words: Array<{
    word: string;
    startTime: number;
    endTime: number;
    index: number;
  }>;
  style: {
    fontFamily: string;                // default: "Inter"
    fontSize: number;                  // 12-72, default: 24
    fontWeight: "normal" | "bold";
    color: string;                     // hex #FFFFFF
    outlineColor: string;              // #000000
    outlineWidth: number;
    backgroundColor: string;           // hex with alpha #00000080
    backgroundPadding: number;
    backgroundRadius: number;
    position: "bottom" | "top" | "center";
    alignment: "left" | "center" | "right";
    marginBottom: number;
    maxWidth: number;                  // 0.3-1.0, fraction of video width
  };
  animation: {
    entrance: "none" | "fade_in" | "slide_up" | "typewriter" | "scale_up";
    exit: "none" | "fade_out" | "slide_down" | "scale_down";
    entranceDuration: number;          // seconds
    exitDuration: number;
    wordHighlight: {
      enabled: boolean;
      activeColor: string;             // #FFDD00
      inactiveColor: string;           // #FFFFFF80
    };
  };
  metadata: {
    source: "ai_generated" | "manual" | "edited";
    confidence: number;                // 0-1
    originalText: string;
  };
}
```

---

## 7. Prompt System (per Template)

Prompts are stored in DB (`prompt_templates` table) with versioning for A/B testing and rollback without deploys.

### Tutorial Template

**Phase 1 (per-batch analysis):**
> Analyze {frameCount} frames from a software tutorial ({startTime}s-{endTime}s). Describe: UI visible, user actions (clicks, typing, navigation), on-screen text, screen transitions, apparent goal. Output JSON: `{description, actions[], visibleText[], uiContext}`.

**Phase 2 (subtitle synthesis):**
> Generate subtitles for tutorial "{projectTitle}" ({duration}s). Rules: imperative mood ("Click the File menu"), 5-15 words each, no gaps >3s, group micro-actions, add transitions between sections. Output JSON array: `[{startTime, endTime, text}]`.

### Product Demo Template

**Phase 1:** Focus on features showcased, value/benefits demonstrated, results/outcomes, before/after comparisons.

**Phase 2:** Confident professional tone, highlight features + benefits, present tense, 8-20 words, feature labels, narrative arc (intro → features → results → conclusion).

---

## 8. Tech Stack

### Frontend
| Tech | Purpose |
|------|---------|
| Next.js 14 (App Router) | SSR, RSC, routing |
| TypeScript | Type safety |
| Zustand | Editor state (high-frequency updates) |
| Tailwind CSS + Radix UI | Styling + accessible primitives |
| HTML5 Video + Canvas | Video playback + subtitle/annotation overlay |
| tus-js-client | Resumable chunked uploads |
| openapi-typescript | Type-safe API client from spec |

### Backend
| Tech | Purpose |
|------|---------|
| Node.js 20 + Fastify 5 | API server (2-3x faster than Express) |
| TypeScript | Shared types with frontend |
| Drizzle ORM | Type-safe DB access + migrations |
| Zod | Runtime validation + OpenAPI generation |
| BullMQ | Redis-based async job queue |
| fluent-ffmpeg | FFmpeg wrapper for video processing |
| tus-node-server | Chunked upload server |

### Infrastructure
| Tech | Purpose |
|------|---------|
| PostgreSQL 16 | Primary database (JSONB for subtitle data) |
| Redis 7 | BullMQ backend, SSE pub/sub |
| AWS S3 (or MinIO) | Object storage for video/frames/audio |
| CloudFront / Cloudflare R2 | CDN for exported videos |
| Docker + Docker Compose | Development and deployment |
| Turborepo | Monorepo management |

### AI Providers
| Provider | Model | Use Case |
|----------|-------|----------|
| OpenAI | GPT-4o | Primary vision analysis |
| Google | Gemini 2.0 Flash | Budget/fast fallback |
| Anthropic | Claude Sonnet | Premium analysis |
| ElevenLabs | Multilingual v2 | Voice synthesis |

---

## 9. Risks & Technical Challenges

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Token limits for long videos** | Can't send 1,200 frames in one call | Two-phase analysis: parallel batch descriptions → single synthesis call |
| **Processing time (~10-17min for 20min video)** | Poor UX waiting | Granular SSE progress, allow editing during processing, offer Gemini Flash for speed |
| **Cost per video ($0.40-$3.00)** | Expensive at scale | Default to Gemini Flash, cache frame analysis, configurable frame rate, credit system |
| **FFmpeg subtitle rendering complexity** | Custom fonts + animations are hard | Use ASS format (supports styling/karaoke tags), fallback to canvas frame-by-frame rendering |
| **Real-time preview performance** | Canvas overlay at 30fps on low-end devices | requestAnimationFrame + dirty-rect rendering, pre-compute positions, "performance mode" |
| **TTS audio-subtitle desync** | ElevenLabs audio duration ≠ subtitle timing | Measure actual audio duration post-TTS, adjust subtitle timing, insert silence gaps |
| **Screen recording quality variance** | MediaRecorder inconsistent across browsers | Transcode all recordings to H.264 on ingest, show browser compatibility warnings |
| **Concurrent processing load** | Multiple users overwhelm workers | BullMQ rate limiting, separate CPU-heavy vs I/O-heavy workers, auto-scaling, priority queues |

---

## 10. Database Schema (Key Entities)

```
users           → id, email, name, plan, credits_remaining
projects        → id, user_id, title, status, template, language, voice_enabled, voice_id
videos          → id, project_id, storage_key, duration, width, height, fps, source
video_trims     → id, project_id, start_time, end_time
subtitle_tracks → id, project_id, language, version, default_style (JSONB)
subtitles       → id, track_id, index, start_time, end_time, text, words (JSONB),
                   style_override (JSONB), animation (JSONB), source, confidence
annotations     → id, project_id, type, time, duration, data (JSONB)
analysis_segments → id, project_id, segment_index, provider, model, analysis_result (JSONB)
voice_segments  → id, project_id, subtitle_id, voice_id, storage_key, duration
voice_tracks    → id, project_id, storage_key, duration
exports         → id, project_id, quality, format, include_voice, storage_key, status
jobs            → id, project_id, queue_name, type, status, progress, metadata (JSONB)
prompt_templates → id, name, phase, version, content, is_active
```

---

## 11. Project Structure

```
syncloop/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/(dashboard)/projects/[id]/
│   │   │   ├── upload/  config/  editor/  export/
│   │   ├── components/editor/
│   │   │   ├── VideoPlayer.tsx  SubtitleOverlay.tsx  Timeline.tsx
│   │   │   ├── SubtitleList.tsx  TypographyPanel.tsx  AnimationPanel.tsx
│   │   │   └── AnnotationTools.tsx  TrimControls.tsx
│   │   ├── hooks/                    # useVideoPlayer, useSubtitles, useSSE
│   │   └── stores/                   # editorStore, projectStore (Zustand)
│   │
│   └── api/                          # Fastify backend
│       └── src/
│           ├── routes/               # projects, upload, subtitles, voice, export, events
│           ├── services/             # business logic per domain
│           ├── workers/              # BullMQ workers: ingest, analyze, voice, export
│           ├── ai/                   # provider interface + implementations + prompt builder
│           ├── video/                # ffmpeg service, frame extractor, ASS renderer
│           ├── storage/              # S3 service
│           └── db/                   # Drizzle schema + migrations
│
├── packages/shared/                  # Shared TypeScript types + Zod schemas
├── docker-compose.yml
└── turbo.json
```

---

## 12. Implementation Phases (Detailed Breakdown)

### PHASE 1: MVP Simple (sin workers, sin BullMQ, sin voice, sin timeline editor)

**Step 1.1 — Project Setup + Upload + Project CRUD**
- Init monorepo: Next.js 14 frontend + backend API routes (Next.js API routes, no Fastify)
- PostgreSQL con Drizzle ORM (schema: projects, videos)
- Upload de video: simple form upload (no tus, no chunked — max 500MB via multipart)
- Guardar archivo en disco local (`/uploads/`) — sin S3
- FFprobe: extraer duración, resolución, fps
- API: POST /api/projects, GET /api/projects, GET /api/projects/:id, DELETE /api/projects/:id
- UI: página de proyectos, formulario de creación, preview con metadata del video

**Step 1.2 — Frame Extraction**
- FFmpeg extrae frames cada 2-3 segundos
- Guardar frames en `/uploads/{projectId}/frames/`
- API: POST /api/projects/:id/extract-frames → ejecuta FFmpeg síncrono
- UI: botón "Extraer frames", mostrar progreso simple

**Step 1.3 — AI Analysis (Single Phase)**
- Tomar TODOS los frames extraídos
- Enviar a OpenAI GPT-4o en UNA sola llamada (o máximo 2-3 si excede contexto)
- Prompt incluye: título del proyecto, template (tutorial/demo), frames como imágenes
- Response: JSON array de subtítulos con startTime, endTime, text
- Validar con Zod, guardar en DB (tabla subtitles)
- API: POST /api/projects/:id/generate-subtitles
- UI: botón "Generar subtítulos", loading state

**Step 1.4 — Video Player + Subtitle Overlay**
- Componente React: HTML5 `<video>` + CSS overlay para subtítulos
- Cargar subtítulos del proyecto
- Mostrar subtítulo activo basado en `currentTime` del video
- Edición inline básica: click en subtítulo → editar texto
- API: PATCH /api/projects/:id/subtitles/:sid (editar texto/timing)
- UI: video player con subtítulos, lista de subtítulos al costado

**Step 1.5 — Export Básico**
- FFmpeg: quemar subtítulos en el video (drawtext filter)
- Generar archivo .mp4 con subtítulos hardcoded
- API: POST /api/projects/:id/export → ejecuta FFmpeg síncrono
- UI: botón "Exportar", descarga del archivo resultante

---

### PHASE 2: Mejoras al Editor
- Timeline visual (DOM-based, no canvas)
- Typography: font, color, size
- Subtitle animations simples (fade in/out via CSS)
- Template Product Demo
- Múltiples calidades de export

### PHASE 3: Voice + Features Avanzados
- ElevenLabs integration
- Word-level highlighting
- Annotations/markers
- Video trimming
- Screen recorder

### PHASE 4: Escalabilidad
- Migrar a BullMQ para jobs async
- S3 para storage
- Chunked uploads (tus)
- Multi-provider AI (Gemini, Claude fallback)
- Canvas-based timeline
- Workers separados

---

## Verification Plan

1. **Upload flow**: Upload a 5min test video → verify ingest extracts correct metadata, thumbnail generated in S3
2. **Analysis pipeline**: Trigger analysis → verify frame extraction count, AI batch calls complete, subtitles stored with valid timing
3. **Editor**: Load project → verify video plays with subtitle overlay, edit a subtitle → verify persistence, change typography → verify preview updates
4. **Voice**: Enable voice → generate → verify audio segments created, combined audio plays in sync with subtitles
5. **Export**: Export at 720p → verify output video has burned-in subtitles matching editor preview, audio mixed correctly
6. **SSE**: Open events stream → trigger processing → verify all progress events received in order

---

# Deep Technical Design — Refined Areas

---

## A. Subtitle Editor Architecture (Deep Detail)

### A.1 Timeline Data Model

The timeline is backed by a Zustand store with normalized, sorted data:

```typescript
interface SubtitleSegment {
  id: string;                    // nanoid, stable across edits
  startTime: number;             // seconds, float64 precision (e.g., 1.234)
  endTime: number;
  text: string;
  words: WordTiming[];           // word-level timing for highlight sync
  style: SubtitleStyle;
  voiceId: string | null;
  voiceStatus: 'none' | 'generating' | 'ready' | 'stale';
  editVersion: number;           // incremented on every text/timing change
  locked: boolean;
}

interface WordTiming {
  word: string;
  startOffset: number;           // offset from segment startTime, in seconds
  endOffset: number;
  isHighlighted: boolean;        // runtime flag, not persisted
}

interface AnimationDescriptor {
  entrance: AnimationDef | null;
  exit: AnimationDef | null;
  wordHighlight: WordHighlightDef | null;
}

interface AnimationDef {
  type: 'fadeIn' | 'slideUp' | 'typewriter' | 'scaleIn' | 'fadeOut' | 'slideDown' | 'scaleOut';
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

interface TimelineStore {
  segments: SubtitleSegment[];       // sorted by startTime (invariant)
  segmentIndex: Map<string, number>; // id -> index, rebuilt on sort

  // Playback state
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  activeSegmentId: string | null;

  // Timeline UI state
  zoom: number;                      // pixels per second, default 80
  scrollOffset: number;              // horizontal scroll in seconds
  selection: Set<string>;            // multi-select segment IDs
}
```

Mutations keep the array sorted via insertion sort (O(n) on near-sorted data, fine for ≤500 segments). A secondary `Map<id, index>` enables O(1) lookups.

### A.2 Timeline Rendering — Hybrid Canvas + DOM

**Canvas** for the timeline track (subtitle blocks, playhead, time ruler). Reasons:
- Hundreds of rectangles at 60fps during drag → DOM reflow too expensive
- Pixel-precise hit testing simpler with canvas math
- Zoom/scroll is a simple affine transform

**DOM** overlays for text editing popover, context menu, and style panel (benefit from native input/selection).

**Pixel mapping:**
```typescript
function timeToPixel(timeSec: number, zoom: number, scrollOffset: number): number {
  return (timeSec - scrollOffset) * zoom;
}
function pixelToTime(px: number, zoom: number, scrollOffset: number): number {
  return (px / zoom) + scrollOffset;
}
```

**Rendering loop** — only draws visible segments (binary search culling):
```typescript
function renderTimeline(ctx, state) {
  const viewStart = state.scrollOffset;
  const viewEnd = viewStart + (ctx.canvas.width / state.zoom);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawRuler(ctx, viewStart, viewEnd, state.zoom, state.scrollOffset);

  // Binary search for visible range
  const startIdx = lowerBound(state.segments, viewStart, s => s.endTime);
  const endIdx = upperBound(state.segments, viewEnd, s => s.startTime);

  for (let i = startIdx; i < endIdx; i++) {
    const seg = state.segments[i];
    const x = timeToPixel(seg.startTime, state.zoom, state.scrollOffset);
    const w = (seg.endTime - seg.startTime) * state.zoom;
    drawSegmentBlock(ctx, seg, x, w, state.selection.has(seg.id));
  }

  drawPlayhead(ctx, timeToPixel(state.currentTime, state.zoom, state.scrollOffset));
}
```

**Offscreen canvas double-buffer**: Static content (segments, ruler) rendered to offscreen canvas. During playback, only the playhead is redrawn per frame on top of a `drawImage` blit.

### A.3 Drag-to-Resize/Move and Snapping

Hit testing on canvas determines drag type:
```typescript
interface DragState {
  type: 'move' | 'resizeLeft' | 'resizeRight';
  segmentId: string;
  originalStart: number;
  originalEnd: number;
  anchorMouseX: number;
  snapTargets: number[];   // precomputed: other segment edges + playhead + round times
}

function applySnap(timeSec: number, snapTargets: number[], threshold = 0.1): number {
  for (const target of snapTargets) {
    if (Math.abs(timeSec - target) < threshold) return target;
  }
  return timeSec;
}
```

Constraints: min duration 0.2s, no overlap with adjacent segments, clamped to [0, videoDuration]. On mouseup, if segment has `voiceStatus: 'ready'`, mark `'stale'`.

### A.4 Zoom

`zoom` = pixelsPerSecond, clamped [20, 500]. Zoom anchors on mouse cursor:
```typescript
function handleZoom(delta: number, anchorTimeSec: number) {
  const oldZoom = store.zoom;
  const newZoom = clamp(oldZoom * (1 + delta * 0.1), 20, 500);
  const anchorScreenX = (anchorTimeSec - store.scrollOffset) * oldZoom;
  store.setZoom(newZoom);
  store.setScrollOffset(Math.max(0, anchorTimeSec - (anchorScreenX / newZoom)));
}
```

### A.5 Playback Synchronization

**Primary loop: `requestAnimationFrame`** (not `timeupdate` which fires only ~4/sec).

```typescript
function playbackLoop() {
  if (!store.isPlaying) return;
  const videoTime = videoElement.currentTime;
  store.setCurrentTime(videoTime);

  // Binary search for active subtitle — O(log n)
  const active = findActiveSegment(store.segments, videoTime);
  if (active?.id !== store.activeSegmentId) {
    store.setActiveSegmentId(active?.id ?? null);
  }

  renderSubtitleOverlay(overlayCtx, active, videoTime);
  renderPlayhead(timelineCtx, videoTime);
  rafId = requestAnimationFrame(playbackLoop);
}

function findActiveSegment(segments, time) {
  let lo = 0, hi = segments.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (segments[mid].startTime <= time) {
      if (segments[mid].endTime > time) return segments[mid];
      lo = mid + 1;
    } else { hi = mid - 1; }
  }
  return null;
}
```

**On seek**: immediately update `activeSegmentId`, compute animation state at the seek position (e.g., fadeIn at 50% if seeking into mid-entrance), cancel in-progress animations.

### A.6 Animation System

Declarative description → imperative per-frame computation:

```typescript
interface AnimationFrame {
  opacity: number;           // 0-1
  translateY: number;        // pixels
  scale: number;             // 1.0 = normal
  visibleCharCount: number;  // for typewriter
  highlightedWordIndex: number;
  highlightProgress: number; // 0-1 within current word
}

function computeAnimationFrame(segment, currentTime, videoDimensions): AnimationFrame {
  const elapsed = currentTime - segment.startTime;
  const remaining = segment.endTime - currentTime;
  let frame = { opacity: 1, translateY: 0, scale: 1,
                visibleCharCount: segment.text.length,
                highlightedWordIndex: -1, highlightProgress: 0 };

  // Entrance
  const entrance = segment.style.animation?.entrance;
  if (entrance && elapsed < entrance.duration) {
    const t = easing(elapsed / entrance.duration, entrance.easing);
    switch (entrance.type) {
      case 'fadeIn': frame.opacity = t; break;
      case 'slideUp': frame.translateY = (1 - t) * 30; break;
      case 'typewriter': frame.visibleCharCount = Math.floor(t * segment.text.length); break;
      case 'scaleIn': frame.scale = 0.5 + t * 0.5; break;
    }
  }
  // Exit (same pattern with remaining time)
  // Word highlight: iterate segment.words, find active by startOffset/endOffset
  return frame;
}
```

**Canvas rendering**: `clearRect` → `computeAnimationFrame` → apply `globalAlpha`, `translate`, `scale` → draw text. Word highlight draws each word with `fillText` at computed x-offsets (cached via `ctx.measureText()`, recalculated only on text/style changes).

**Performance**: Animation math is pure arithmetic (<0.1ms). Canvas draw is ~5-10 `fillText` calls (<0.5ms). Total per frame well under 1ms. Cache `measureText` results per segment.

### A.7 Performance Bounds

- **500 segments**: comfortable. Binary search = 9 comparisons. Timeline culling shows ~20-40 visible.
- **2,000 segments**: still performant with culling. Store mutations use insertion sort.
- **Offscreen canvas**: eliminates redundant segment redraws during playback.
- **Web Workers**: only for SRT/VTT import parsing, waveform computation, subtitle diff.
- **Memory**: ~500KB subtitle data + ~24MB canvas buffers + ~20MB decoded TTS audio = ~45MB total. Well within browser limits.

---

## B. Voice-Subtitle Synchronization (Deep Detail)

### B.1 Duration Mismatch — Strategy

**Primary: Adjust subtitle timing to match audio duration.** Secondary: use ElevenLabs `speed` parameter as a pre-optimization hint.

**Rejected**: Time-stretching audio (produces audible artifacts, unacceptable quality).

**Flow:**
1. Calculate target WPM from subtitle duration and word count
2. Map to ElevenLabs speed parameter (clamped [0.7, 1.3])
3. Call ElevenLabs API
4. Measure actual audio duration from response
5. If |actual - expected| > 0.3s:
   - Adjust subtitle `endTime = startTime + actualDuration`
   - Ripple-adjust subsequent subtitles forward by delta
   - Notify user, allow accept/reject per-segment
6. If ripple causes overlap → flag conflict for manual resolution

### B.2 Word-Level Alignment

ElevenLabs returns character-level timestamps. Map to word-level:

```typescript
function mapElevenLabsAlignment(subtitleText, alignment): WordTiming[] {
  const words = subtitleText.split(/\s+/);
  const result = [];
  let charIdx = 0;

  for (const word of words) {
    // Skip whitespace in alignment characters
    while (charIdx < alignment.characters.length && alignment.characters[charIdx].match(/\s/)) charIdx++;

    const wordStart = alignment.character_start_times_seconds[charIdx];
    // Advance through word's characters with fuzzy matching (contractions, punctuation)
    let lastCharIdx = charIdx;
    for (let i = 0; i < word.length && charIdx < alignment.characters.length; i++) {
      lastCharIdx = charIdx;
      charIdx++;
    }
    const wordEnd = alignment.character_end_times_seconds[lastCharIdx];

    result.push({ word, startOffset: wordStart, endOffset: wordEnd, isHighlighted: false });
  }
  return result;
}
```

**Fallback**: If word count doesn't match, distribute proportionally by character count.

### B.3 Audio Composition

**Client-side preview**: Web Audio API with `AudioContext`. Schedule segments at their `startTime`. Silence is implicit (no audio scheduled in gaps). On seek: cancel all scheduled sources, reschedule upcoming.

**Server-side export**: FFmpeg `adelay` filter per segment + `amix`:
```bash
ffmpeg -i input_video.mp4 -i seg_001.mp3 -i seg_002.mp3 ...
  -filter_complex "[1]adelay=2500|2500[s1]; [2]adelay=8200|8200[s2]; ...
    [0:a][s1][s2]amix=inputs=N:duration=first[out]"
  -map 0:v -map "[out]" output.mp4
```

### B.4 Invalidation Strategy

| Event | Action |
|-------|--------|
| Text edited | `voiceStatus = 'stale'`, clear word timings |
| Timing changed (>0.5s delta) | `voiceStatus = 'stale'` |
| Timing changed (<0.5s delta) | Reschedule audio, keep status |
| Subtitle deleted | Unload audio, queue S3 cleanup (1hr grace for undo) |
| Subtitle split | Both halves get `voiceStatus = 'stale'` |

Use `editVersion` counter per segment. Voice generation records `voiceEditVersion` at trigger time. On completion, discard result if versions don't match.

### B.5 Edge Cases

- **Very short subtitles (<1s)**: Enforce minimum 0.5s in UI. Warn if audio will overflow.
- **Unicode/emoji**: Strip emoji before TTS, keep in display text. Log warning if no speakable content.
- **Overlapping subtitles with voice**: Queue as sequential TTS calls, mix at their respective start times. If audio overlaps → warn user.

---

## C. Video Analysis Pipeline (Improved)

### C.1 Smart Frame Sampling (Two-Pass)

**Pass 1 — Scene detection (FFmpeg):**
```bash
ffmpeg -i input.mp4 -vf "select='gt(scene,THRESHOLD)',showinfo" -vsync vfr -f null -
```

**Adaptive threshold calibration**: Sample 30s from video middle at threshold 0.2. Count frames/second:
- \>3 fps → threshold = 0.4 (too many)
- 0.5-3 fps → threshold = 0.25 (default)
- <0.5 fps → threshold = 0.15 (too few)

**Pass 2 — Fill gaps**: If no scene change detected for >3s, insert periodic samples at 2s intervals.

```typescript
function computeSamplingPlan(sceneChanges: number[], duration: number): number[] {
  const filled = [...sceneChanges];
  for (let i = 0; i < sceneChanges.length - 1; i++) {
    const gap = sceneChanges[i + 1] - sceneChanges[i];
    if (gap > 3) {
      let t = sceneChanges[i] + 2;
      while (t < sceneChanges[i + 1] - 1) { filled.push(t); t += 2; }
    }
  }
  return filled.sort((a, b) => a - b);
}
```

**Expected results (20min video):**
| Strategy | Frames | Reduction |
|----------|--------|-----------|
| Naive 1fps | 1,200 | baseline |
| Scene detection only | 150-400 | 67-88% |
| Scene + gap fill | 400-600 | 50-67% |

### C.2 Event Detection

**Perceptual hashing (pHash)** for near-duplicate detection:
- Resize frame to 32x32 grayscale, compute average, generate 64-bit hash
- Hamming distance <5 = near-identical → skip

**FFmpeg filters for structural events:**
```bash
ffmpeg -i input.mp4 -vf "blackdetect=d=0.5:pix_th=0.10" -f null -  # loading screens
ffmpeg -i input.mp4 -vf "freezedetect=n=0.003:d=2" -f null -        # static content
```

**Frame metadata enrichment:**
```typescript
interface FrameMetadata {
  timestamp: number;
  type: 'scene_change' | 'periodic' | 'gap_fill';
  ssimVsPrevious: number;
  isBlackFrame: boolean;
  isFrozenRegion: boolean;
}
```

Mouse/click and UI interaction detection are delegated to the AI model with this metadata as structured context.

### C.3 Deduplication Before AI Calls

Compare consecutive frames via pHash. Skip if hamming distance <5:
```typescript
function deduplicateFrames(frames) {
  const result = [frames[0]];
  for (let i = 1; i < frames.length; i++) {
    if (hammingDistance(frames[i].phash, result[result.length - 1].phash) >= 5) {
      result.push(frames[i]);
    }
  }
  return result;
}
```
**Savings**: 30-50% fewer frames → 30-50% fewer API calls.

### C.4 Scene-Based Batching (Variable-Length)

Instead of fixed 10s windows, batch by detected scenes:

```typescript
interface AnalysisBatch {
  sceneId: string;
  startTime: number;
  endTime: number;
  frames: FrameWithMetadata[];
  contextFrames: {
    prevSceneLastFrame: FrameWithMetadata | null;   // continuity
    nextSceneFirstFrame: FrameWithMetadata | null;
  };
  priority: 'high' | 'normal' | 'low';  // more frames = higher priority
}
```

High-priority scenes get detailed prompts, low-priority (static) get brief prompts. Context frames from adjacent scenes improve continuity.

---

## D. Project State Machine (Complete)

### D.1 State Diagram

```
                           ┌──────────────┐
                           │    DRAFT     │
                           └──────┬───────┘
                    user upload   │
                           ┌──────▼───────┐       ┌───────────────┐
                           │  UPLOADING   ├──────►│ UPLOAD_FAILED │
                           └──────┬───────┘  fail └───────┬───────┘
                        complete  │                  retry │
                           ┌──────▼───────┐◄──────────────┘
                           │  INGESTING   │       ┌───────────────┐
                           │ (probe+xcode)├──────►│ INGEST_FAILED │
                           └──────┬───────┘  fail └───────┬───────┘
                        complete  │                  retry │
                           ┌──────▼───────┐◄──────────────┘
                           │ CONFIGURING  │
                           └──────┬───────┘
                    user analyze  │
                           ┌──────▼───────┐       ┌─────────────────┐
                           │  ANALYZING   ├──────►│ ANALYSIS_FAILED │
                           │              │  fail │ (partial ok)    │
                           └──┬───────┬───┘       └───────┬─────────┘
                 all done  │  │       │ user enters       │ retry failed
                           │  │       │ editor early      │ batches
                           ▼  │       ▼                   │
                    ┌─────────┐  ┌────────────────────────▼──────────┐
                    │ANALYZED │  │                                    │
                    └────┬────┘  │            EDITING                 │
                 auto    │       │                                    │
                         ├──────►│  Sub-states (concurrent):         │
                                 │   Subtitles: idle | editing       │
                                 │   Voice: idle | generating |      │
                                 │     ready | partial_fail | stale  │
                                 │                                    │
                                 └──────────┬─────────────────────────┘
                               user export  │
                           ┌────────────────▼─┐     ┌───────────────┐
                           │    EXPORTING     ├────►│ EXPORT_FAILED │
                           └────────┬─────────┘fail └───────┬───────┘
                          complete  │                  retry │
                           ┌────────▼─────────┐◄────────────┘
                           │    COMPLETE      │
                           └────────┬─────────┘
                        edit again  │
                                    ▼
                                 EDITING
```

### D.2 States and Types

```typescript
type ProjectState =
  | 'draft' | 'uploading' | 'upload_failed'
  | 'ingesting' | 'ingest_failed'
  | 'configuring' | 'analyzing' | 'analysis_failed' | 'analyzed'
  | 'editing' | 'exporting' | 'export_failed' | 'complete';

type VoiceGenerationState =
  | 'idle' | 'generating' | 'ready' | 'partial_failed' | 'stale';

interface ProjectStateRecord {
  projectId: string;
  state: ProjectState;
  voiceState: VoiceGenerationState;
  analysisBatches: { total: number; completed: number; failed: number; failedBatchIds: string[] } | null;
  exportProgress: { percent: number; stage: 'preparing' | 'rendering' | 'encoding' | 'uploading' } | null;
  lastError: { state: ProjectState; message: string; retryCount: number; maxRetries: number; timestamp: Date } | null;
}
```

### D.3 Transition Rules

```typescript
const TRANSITIONS = {
  draft:           [{ to: 'uploading', trigger: 'user' }],
  uploading:       [{ to: 'ingesting', trigger: 'system', on: 'uploadComplete' },
                    { to: 'upload_failed', trigger: 'system', on: 'uploadError' }],
  upload_failed:   [{ to: 'uploading', trigger: 'user', action: 'retry' },
                    { to: 'draft', trigger: 'user', action: 'reset' }],
  ingesting:       [{ to: 'configuring', trigger: 'system', on: 'ingestComplete' },
                    { to: 'ingest_failed', trigger: 'system', on: 'ingestError' }],
  ingest_failed:   [{ to: 'ingesting', trigger: 'user', action: 'retry' },
                    { to: 'draft', trigger: 'user', action: 'reupload' }],
  configuring:     [{ to: 'analyzing', trigger: 'user', pre: 'configValid' }],
  analyzing:       [{ to: 'analyzed', trigger: 'system', on: 'allBatchesDone' },
                    { to: 'analysis_failed', trigger: 'system', on: 'anyBatchFailed' },
                    { to: 'editing', trigger: 'user', pre: 'atLeastOneBatchDone' }],
  analysis_failed: [{ to: 'analyzing', trigger: 'user', action: 'retryFailed' },
                    { to: 'editing', trigger: 'user', pre: 'atLeastOneBatchDone' },
                    { to: 'configuring', trigger: 'user', action: 'reconfigure' }],
  analyzed:        [{ to: 'editing', trigger: 'system', auto: true }],
  editing:         [{ to: 'exporting', trigger: 'user', pre: 'noStaleVoicesOrConfirmed' },
                    { to: 'analyzing', trigger: 'user', action: 'reanalyze' }],
  exporting:       [{ to: 'complete', trigger: 'system', on: 'exportDone' },
                    { to: 'export_failed', trigger: 'system', on: 'exportError' }],
  export_failed:   [{ to: 'exporting', trigger: 'user', action: 'retry' },
                    { to: 'editing', trigger: 'user' }],
  complete:        [{ to: 'editing', trigger: 'user', action: 'editAgain' }]
};
```

**Early editor entry during analysis**: Subtitles from completed batches stream in via SSE. Progress indicator shows "7/12 batches complete". Analysis jobs continue independently.

**Export failure recovery**: Record last checkpoint. On retry, resume from checkpoint if possible (intermediate files cached), else restart.

### D.4 State Persistence

- **PostgreSQL**: Authoritative state, voice state, progress JSONB, retry count, error info
- **Redis**: Ephemeral data — playback position (session resume), edit locks (optimistic concurrency), real-time export percent

**Stale job recovery on startup:**
```typescript
async function recoverStaleProjects() {
  const stale = await db.query(`
    SELECT id, state FROM projects
    WHERE state IN ('uploading','ingesting','analyzing','exporting')
    AND updated_at < NOW() - INTERVAL '10 minutes'`);
  for (const p of stale.rows) {
    const hasActiveJob = await checkBullMQJob(p.id);
    if (!hasActiveJob) {
      await transitionProject(p.id, failedStateFor(p.state), {
        lastError: { message: 'Processing interrupted', retryCount: 0 }
      });
    }
  }
}
```

BullMQ's `stalledInterval` (30s) detects crashed workers and retries or moves to failed queue.

---

## E. Hidden Technical Risks (Previously Uncovered)

### E.1 Browser Memory Limits with Long Videos

**Problem**: 20min 1080p video → browser decode buffer 300-500MB. Add canvas (24MB), TTS audio (20MB), store. Can approach 800MB-1GB.
**Likelihood**: High for >10min at 1080p. **Impact**: High (tab crash, data loss).
**Mitigation**: Transcode to 720p/2Mbps on ingest (-60% memory). Use MediaSource extensions to buffer only 30s ahead/10s behind. Auto-save every 30s. Monitor `performance.memory`, offer "light mode".

### E.2 S3 Signed URL Expiration During Long Sessions

**Problem**: Presigned URLs expire (1-15min). 2-hour editing session = broken video playback.
**Likelihood**: Certain. **Impact**: High.
**Mitigation**: Set 4-hour expiration. Frontend tracks expiry, refreshes via `/refresh-urls` endpoint 15min before expiry. Use service worker to transparently proxy and refresh video URLs (avoid changing `<video>` src). Cache TTS blobs in IndexedDB.

### E.3 Race Conditions in Concurrent Subtitle Edits

**Problem**: Voice generation callback may overwrite user edits made during async TTS processing.
**Likelihood**: Medium. **Impact**: Medium (wrong word timings).
**Mitigation**: `editVersion` counter per segment. Voice generation records version at trigger. On callback, discard if version mismatch and mark stale.

### E.4 FFmpeg Memory During Complex Export

**Problem**: 200+ subtitle overlays + audio mixing in single FFmpeg pass can OOM on small servers.
**Likelihood**: Medium. **Impact**: High (export fails).
**Mitigation**: Chunked export (60s chunks, concat after). Use `drawtext` filter (not PNG overlays). Only pre-render PNGs for animated segments. Set `-max_alloc`, monitor RSS.

### E.5 AI Model Output Parsing Failures

**Problem**: LLMs produce malformed JSON 5-15% of the time. Hallucinated timestamps, overlapping segments, out-of-range values.
**Likelihood**: High. **Impact**: Medium.
**Mitigation**: Use structured output / JSON mode. Validate with Zod schema. Auto-repair soft failures (clamp timestamps, resolve overlaps, merge tiny gaps). Retry budget: 2 retries per batch with cheaper model fallback.

### E.6 Cost Explosion from Retries

**Problem**: 120 batches × 3 retries × $0.15/batch = $54 worst case vs $2.70 happy path.
**Likelihood**: Low for full explosion, medium for 2-3x overruns. **Impact**: High (financial).
**Mitigation**: Hard retry cap (3/batch). Per-project cost budget ($15 cap, halt + alert). Circuit breaker: 5 consecutive failures → halt entire job. Fall back to cheaper model on retry. Log all API costs.

### E.7 Accessibility

**Problem**: Canvas timeline/overlay invisible to screen readers. Color-only status indicators.
**Likelihood**: Certain. **Impact**: Medium (legal, exclusion).
**Mitigation**: Hidden ARIA live region for active subtitle. Alternative DOM-based list view. Keyboard shortcuts (Tab to navigate, Enter to edit, Shift+Arrow to resize). All indicators use icon + color + tooltip (triple encoding).

### E.8 Mobile Browser Limitations

**Problem**: Canvas size caps (iOS 16MP), limited Web Audio, aggressive tab killing (80MB on Safari), no touch-drag mapping.
**Likelihood**: Certain if mobile targeted. **Impact**: Medium.
**Mitigation**: **v1 is desktop-only.** Show warning on <1024px viewports. v2: simplified DOM timeline on mobile, reduced canvas resolution, `use-gesture` for touch.
