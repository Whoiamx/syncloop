"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDuration, formatFileSize } from "@/lib/format";
import { useI18n } from "@/lib/i18n-context";
import Timeline from "./timeline";
import SubtitleStylePanel from "./subtitle-style-panel";
import ProcessingScreen, { type ProcessingStepInfo, type ProcessingStep } from "./processing-screen";
import { defaultSubtitleStyle, type SubtitleStyle } from "@/db/schema";
import { useToast } from "@/lib/toast-context";
import { useConfirm } from "@/lib/confirm-dialog";

interface Video {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
}

interface Subtitle {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface Project {
  id: string;
  title: string;
  status: string;
  template: string | null;
  language: string | null;
  subtitleStyle: SubtitleStyle | null;
  createdAt: string;
  video: Video | null;
  subtitles: Subtitle[];
}

const statusStyles: Record<string, { bg: string; dot: string }> = {
  draft: { bg: "bg-surface-700 text-surface-300", dot: "bg-surface-400" },
  uploaded: {
    bg: "bg-brand-500/15 text-brand-300 border border-brand-500/20",
    dot: "bg-brand-400",
  },
  frames_extracted: {
    bg: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
    dot: "bg-sky-400",
  },
  analyzing: {
    bg: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
    dot: "bg-amber-400",
  },
  ready: {
    bg: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    dot: "bg-emerald-400",
  },
};

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

function findActiveSubtitle(subtitles: Subtitle[], time: number): Subtitle | null {
  let lo = 0;
  let hi = subtitles.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (subtitles[mid].startTime <= time) {
      if (subtitles[mid].endTime > time) return subtitles[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return null;
}

// ─── Subtitle Overlay on Video ───────────────────────────────────────
function SubtitleOverlay({
  subtitles,
  videoRef,
  style,
}: {
  subtitles: Subtitle[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  style: SubtitleStyle;
}) {
  const [activeText, setActiveText] = useState<string | null>(null);
  const [prevText, setPrevText] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || subtitles.length === 0) return;

    function tick() {
      const t = video!.currentTime;
      const active = findActiveSubtitle(subtitles, t);
      setActiveText((prev) => {
        const next = active?.text ?? null;
        if (next !== prev) {
          setPrevText(prev);
          setAnimKey((k) => k + 1);
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [subtitles, videoRef]);

  if (!activeText) return null;

  const bgHex = style.backgroundColor + Math.round(style.backgroundOpacity * 255).toString(16).padStart(2, "0");
  const animClass =
    style.animation === "fade"
      ? "animate-sub-fade"
      : style.animation === "slide"
      ? "animate-sub-slide"
      : style.animation === "typewriter"
      ? "animate-sub-type"
      : "";

  return (
    <div className="absolute bottom-12 left-0 right-0 z-10 flex justify-center pointer-events-none px-4">
      <div
        key={animKey}
        className={`font-medium px-4 py-2 rounded-lg max-w-[85%] text-center leading-relaxed shadow-lg ${animClass}`}
        style={{
          fontFamily: style.fontFamily,
          fontSize: `${style.fontSize}px`,
          color: style.textColor,
          backgroundColor: style.showBackground ? bgHex : "transparent",
          backdropFilter: style.showBackground ? "blur(8px)" : "none",
        }}
      >
        {activeText}
      </div>
    </div>
  );
}

// ─── Inline Editable Subtitle Row ────────────────────────────────────
function SubtitleRow({
  sub,
  isActive,
  projectId,
  onUpdated,
  onSeek,
  t,
}: {
  sub: Subtitle;
  isActive: boolean;
  projectId: string;
  onUpdated: (updated: Subtitle) => void;
  onSeek: (time: number) => void;
  t: Record<string, string>;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(sub.text);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isActive && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isActive]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function handleSave() {
    if (editText.trim() === sub.text || !editText.trim()) {
      setEditing(false);
      setEditText(sub.text);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/subtitles/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdated(updated);
        setJustSaved(true);
        toast(t.subtitleSaved || "Subtitle saved", "success");
        setTimeout(() => setJustSaved(false), 1000);
      }
    } catch {
      setEditText(sub.text);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setEditText(sub.text);
    }
  }

  return (
    <div
      ref={rowRef}
      className={`group flex gap-3 rounded-xl px-3.5 py-3 transition-all cursor-pointer ${
        justSaved
          ? "animate-save-flash border border-emerald-500/25"
          : isActive
          ? "bg-brand-500/10 border border-brand-500/25 ring-1 ring-brand-500/10"
          : "border border-transparent hover:bg-surface-800/40"
      }`}
    >
      {/* Timecode - click to seek */}
      <button
        onClick={() => onSeek(sub.startTime)}
        className="shrink-0 text-left"
        title={t.clickToSeek}
      >
        <span
          className={`font-mono text-xs tabular-nums block ${
            isActive ? "text-brand-400" : "text-surface-500 group-hover:text-surface-300"
          } transition-colors`}
        >
          {formatTimecode(sub.startTime)}
        </span>
        <span
          className={`font-mono text-[11px] tabular-nums block mt-0.5 ${
            isActive ? "text-brand-500/60" : "text-surface-600"
          }`}
        >
          {formatTimecode(sub.endTime)}
        </span>
      </button>

      {/* Text - click to edit */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <textarea
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={saving}
            rows={2}
            className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-[15px] text-surface-100 resize-none focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 disabled:opacity-50"
          />
        ) : (
          <div
            onClick={() => {
              setEditText(sub.text);
              setEditing(true);
            }}
            className={`flex items-start gap-2 text-[15px] leading-relaxed cursor-text rounded px-1 -mx-1 transition-colors ${
              isActive
                ? "text-surface-100"
                : "text-surface-300 group-hover:text-surface-100"
            } hover:bg-surface-800/60`}
            title={t.editSubtitle}
          >
            <span className="flex-1">{sub.text}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-0.5 text-surface-600 group-hover:text-surface-400 transition-colors"
            >
              <path d="M12 20h9" />
              <path d="M16.376 3.622a1 1 0 013.002 3.002L7.368 18.635a2 2 0 01-.855.506l-2.872.838.838-2.872a2 2 0 01.506-.855L16.376 3.622z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { t } = useI18n();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportReady, setExportReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(defaultSubtitleStyle);
  const [savingStyle, setSavingStyle] = useState(false);

  // Auto-processing pipeline state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStepInfo[]>([
    { id: "uploading", status: "completed" },
    { id: "extracting", status: "pending" },
    { id: "analyzing", status: "pending" },
    { id: "generating", status: "pending" },
  ]);
  const [currentProcessingStep, setCurrentProcessingStep] = useState<ProcessingStep>("uploading");
  const [processingError, setProcessingError] = useState("");
  const processingStartedRef = useRef(false);

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error(t.projectNotFound);
        return r.json();
      })
      .then(setProject)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id, t.projectNotFound]);

  // Initialize subtitle style from project data
  useEffect(() => {
    if (project?.subtitleStyle) {
      setSubtitleStyle({ ...defaultSubtitleStyle, ...project.subtitleStyle });
    }
  }, [project?.subtitleStyle]);

  // Fullscreen change listener
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Auto-processing pipeline: when project loads with status "uploaded" and no subtitles,
  // automatically extract frames + generate subtitles
  useEffect(() => {
    if (!project || !project.video || processingStartedRef.current) return;

    const needsProcessing =
      (project.status === "uploaded" || project.status === "frames_extracted" || project.status === "analyzing") &&
      project.subtitles.length === 0;

    if (!needsProcessing) return;

    processingStartedRef.current = true;
    runProcessingPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  async function runProcessingPipeline() {
    setIsProcessing(true);
    setProcessingError("");

    const updateStep = (id: ProcessingStep, status: ProcessingStepInfo["status"], error?: string) => {
      setProcessingSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, error } : s))
      );
      if (status === "in_progress") setCurrentProcessingStep(id);
    };

    try {
      // Step 1: Upload already done
      updateStep("uploading", "completed");

      // Step 2: Extract frames
      updateStep("extracting", "in_progress");
      const extractRes = await fetch(`/api/projects/${params.id}/extract-frames`, {
        method: "POST",
      });
      if (!extractRes.ok) {
        const data = await extractRes.json();
        throw new Error(data.error || "Frame extraction failed");
      }
      updateStep("extracting", "completed");

      // Step 3: Analyzing (same API call as generating, but we show it as two visual steps)
      updateStep("analyzing", "in_progress");
      // Small delay for visual feedback
      await new Promise((r) => setTimeout(r, 800));
      updateStep("analyzing", "completed");

      // Step 4: Generate subtitles
      updateStep("generating", "in_progress");
      const genRes = await fetch(`/api/projects/${params.id}/generate-subtitles`, {
        method: "POST",
      });
      if (!genRes.ok) {
        const data = await genRes.json();
        throw new Error(data.error || "Subtitle generation failed");
      }
      updateStep("generating", "completed");

      // Reload project data
      const projRes = await fetch(`/api/projects/${params.id}`);
      if (projRes.ok) {
        const newProject = await projRes.json();
        setProject(newProject);
      }

      // Short delay to show completion before hiding
      await new Promise((r) => setTimeout(r, 1200));
      setIsProcessing(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Processing failed";
      setProcessingError(errorMsg);

      // Mark current step as error
      setProcessingSteps((prev) =>
        prev.map((s) =>
          s.status === "in_progress" ? { ...s, status: "error", error: errorMsg } : s
        )
      );
    }
  }

  function handleRetryProcessing() {
    processingStartedRef.current = false;
    setProcessingSteps([
      { id: "uploading", status: "completed" },
      { id: "extracting", status: "pending" },
      { id: "analyzing", status: "pending" },
      { id: "generating", status: "pending" },
    ]);
    setProcessingError("");
    setIsProcessing(false);
    // Re-trigger by resetting the ref — the useEffect will pick it up
    setTimeout(() => {
      processingStartedRef.current = true;
      runProcessingPipeline();
    }, 100);
  }

  function toggleFullscreen() {
    if (!videoContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoContainerRef.current.requestFullscreen();
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        const v = videoRef.current;
        if (v) v.paused ? v.play() : v.pause();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSaveStyle(style: SubtitleStyle) {
    if (!project) return;
    setSavingStyle(true);
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtitleStyle: style }),
      });
      if (res.ok) {
        setProject({ ...project, subtitleStyle: style });
        toast(t.styleSaved || "Style saved", "success");
      }
    } catch {
      // ignore
    } finally {
      setSavingStyle(false);
    }
  }

  // Track active subtitle during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !project?.subtitles.length) return;

    let raf = 0;
    function tick() {
      const t = video!.currentTime;
      const active = findActiveSubtitle(project!.subtitles, t);
      setActiveSubId(active?.id ?? null);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [project?.subtitles]);

  function handleSeek(time: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  }

  function handleSubtitleUpdated(updated: Subtitle) {
    if (!project) return;
    setProject({
      ...project,
      subtitles: project.subtitles.map((s) =>
        s.id === updated.id ? { ...s, text: updated.text, startTime: updated.startTime, endTime: updated.endTime } : s
      ),
    });
  }

  async function handleExport() {
    setExporting(true);
    setExportError("");
    setExportReady(false);
    try {
      const res = await fetch(`/api/projects/${params.id}/export`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.exportFailed);
      }
      setExportReady(true);
      // Reload project to get updated status
      const projRes = await fetch(`/api/projects/${params.id}`);
      if (projRes.ok) setProject(await projRes.json());
    } catch (err) {
      setExportError(err instanceof Error ? err.message : t.exportFailed);
    } finally {
      setExporting(false);
    }
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = `/api/projects/${params.id}/export`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const { confirm } = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: t.deleteProject,
      message: t.deleteProjectConfirm,
      confirmText: t.deleteProject,
      cancelText: t.cancel || "Cancel",
      danger: true,
    });
    if (!ok) return;
    await fetch(`/api/projects/${params.id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  if (loading)
    return (
      <div className="animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-7 w-48 bg-surface-800 rounded-lg animate-skeleton" />
            <div className="h-6 w-16 bg-surface-800 rounded-full animate-skeleton" />
          </div>
          <div className="h-8 w-20 bg-surface-800 rounded-lg animate-skeleton" />
        </div>
        {/* Video + subtitle skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div>
            <div className="aspect-video bg-surface-800 rounded-xl animate-skeleton" />
            <div className="h-4 w-60 bg-surface-800 rounded mt-3 animate-skeleton" />
          </div>
          <div className="space-y-3">
            <div className="h-10 bg-surface-800 rounded-lg animate-skeleton" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg border border-surface-800">
                <div className="h-4 w-16 bg-surface-800 rounded animate-skeleton" />
                <div className="flex-1 h-4 bg-surface-800 rounded animate-skeleton" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <p className="text-red-400 font-medium">{error}</p>
        <Link href="/dashboard" className="text-sm text-surface-400 hover:text-surface-200 mt-3 inline-block transition-colors">
          {t.backToProjects}
        </Link>
      </div>
    );

  if (!project)
    return <p className="text-red-400 text-center py-20">{t.projectNotFound}</p>;

  const status = statusStyles[project.status] || statusStyles.draft;
  const hasSubtitles = project.subtitles.length > 0;
  const hasVideo = !!project.video;

  // Show processing screen when auto-pipeline is running
  if (isProcessing || processingError) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-200 mb-6 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t.backToProjects}
        </Link>
        <ProcessingScreen
          steps={processingSteps}
          currentStep={currentProcessingStep}
          projectTitle={project.title}
          t={t}
        />
        {processingError && (
          <div className="flex flex-col items-center mt-6 gap-3" role="alert">
            <p className="text-sm text-red-400">{processingError}</p>
            <button
              onClick={handleRetryProcessing}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-500/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
              </svg>
              {t.retryProcessing}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-200 mb-3 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t.backToProjects}
          </Link>
          <h1 className="text-2xl font-bold text-surface-100 tracking-tight">
            {project.title}
          </h1>
          <div className="flex items-center gap-2.5 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {project.status}
            </span>
            {project.template && (
              <span className="px-3 py-1 rounded-full bg-surface-800 text-xs font-medium text-surface-400">
                {project.template}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/8 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          </svg>
          {t.deleteProject}
        </button>
      </div>

      {/* Main content: Video + Subtitles side by side */}
      {hasVideo ? (
        <div className={`${hasSubtitles ? "grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6" : ""}`}>
          {/* Left: Video Player */}
          <div>
            <div
              ref={videoContainerRef}
              className={`relative rounded-xl overflow-hidden bg-black border border-surface-800 group ${
                isFullscreen ? "flex items-center justify-center" : ""
              }`}
            >
              <video
                ref={videoRef}
                controls
                className={isFullscreen ? "max-h-screen max-w-full" : "w-full"}
                src={`/api/videos/${project.video!.id}`}
              />
              {hasSubtitles && (
                <SubtitleOverlay subtitles={project.subtitles} videoRef={videoRef} style={subtitleStyle} />
              )}
              {/* Custom fullscreen button */}
              <button
                onClick={toggleFullscreen}
                className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
                  </svg>
                )}
              </button>
            </div>
            {/* Video meta */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 px-1">
              <div className="flex items-center gap-1.5 text-sm text-surface-400">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
                  <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {project.video!.fileName}
              </div>
              <span className="text-surface-700">&middot;</span>
              <span className="text-sm text-surface-400">{formatDuration(project.video!.duration)}</span>
              <span className="text-surface-700">&middot;</span>
              <span className="text-sm text-surface-400">{project.video!.width}x{project.video!.height}</span>
              <span className="text-surface-700">&middot;</span>
              <span className="text-sm text-surface-400">{formatFileSize(project.video!.fileSize)}</span>
            </div>

            {/* Timeline */}
            {hasSubtitles && project.video && project.video.duration > 0 && (
              <Timeline
                subtitles={project.subtitles}
                videoDuration={project.video.duration}
                videoRef={videoRef}
                activeSubId={activeSubId}
                projectId={project.id}
                onSubtitleUpdated={handleSubtitleUpdated}
                onSeek={handleSeek}
                onSelectSubtitle={(id) => setActiveSubId(id)}
                t={t}
              />
            )}

          </div>

          {/* Right: Subtitle List (only when subtitles exist) */}
          {hasSubtitles && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2.5">
                  {t.subtitles}
                  <span className="text-xs text-surface-500 bg-surface-800 px-2.5 py-1 rounded-full font-medium">
                    {project.subtitles.length}
                  </span>
                </h2>
                <span className="flex items-center gap-1.5 text-xs text-surface-500">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.376 3.622a1 1 0 013.002 3.002L7.368 18.635a2 2 0 01-.855.506l-2.872.838.838-2.872a2 2 0 01.506-.855L16.376 3.622z" />
                  </svg>
                  {t.editSubtitle}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-340px)] space-y-1 pr-1 scrollbar-thin">
                {project.subtitles.map((sub) => (
                  <SubtitleRow
                    key={sub.id}
                    sub={sub}
                    isActive={activeSubId === sub.id}
                    projectId={project.id}
                    onUpdated={handleSubtitleUpdated}
                    onSeek={handleSeek}
                    t={t}
                  />
                ))}
              </div>

              {/* Export section */}
              <div className="mt-4 pt-4 border-t border-surface-800">
                {exportError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs mb-3">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {exportError}
                  </div>
                )}
                {exportReady ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      {t.exportComplete}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownload}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-500/25"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {t.downloadVideo}
                      </button>
                      <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="px-3 py-2.5 rounded-lg text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all disabled:opacity-50"
                        title={t.reExport}
                        aria-label={t.reExport}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 4v6h6M23 20v-6h-6" />
                          <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:bg-surface-800 disabled:text-surface-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-500/25 disabled:hover:shadow-none"
                  >
                    {exporting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                        </svg>
                        {t.exportingVideo}
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {t.exportVideo}
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Subtitle Style Panel */}
              <SubtitleStylePanel
                style={subtitleStyle}
                onChange={setSubtitleStyle}
                onSave={handleSaveStyle}
                saving={savingStyle}
                t={t}
              />
            </div>
          )}
        </div>
      ) : (
        /* No video uploaded yet */
        <div className="border border-dashed border-surface-700 rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-surface-400 font-medium">{t.noVideoYet}</p>
          <p className="text-xs text-surface-500 mt-1">{t.uploadToStart}</p>
        </div>
      )}
    </div>
  );
}
