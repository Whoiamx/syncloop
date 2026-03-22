"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDuration, formatFileSize } from "@/lib/format";
import { useI18n } from "@/lib/i18n-context";

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

interface Frame {
  index: number;
  filename: string;
  url: string;
}

interface Project {
  id: string;
  title: string;
  status: string;
  template: string | null;
  language: string | null;
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

export default function ProjectDetail() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const loadFrames = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}/frames`);
      if (res.ok) {
        const data = await res.json();
        setFrames(data.frames);
      }
    } catch {
      // Frames may not exist yet
    }
  }, [params.id]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${params.id}`)
        .then((r) => {
          if (!r.ok) throw new Error(t.projectNotFound);
          return r.json();
        })
        .then(setProject),
      loadFrames(),
    ])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id, t.projectNotFound, loadFrames]);

  async function handleExtractFrames() {
    setExtracting(true);
    setExtractError("");
    try {
      const res = await fetch(`/api/projects/${params.id}/extract-frames`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.extractionFailed);
      }
      // Reload frames and project
      await loadFrames();
      const projRes = await fetch(`/api/projects/${params.id}`);
      if (projRes.ok) setProject(await projRes.json());
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : t.extractionFailed
      );
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerateSubtitles() {
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch(`/api/projects/${params.id}/generate-subtitles`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.generationFailed);
      }
      // Reload project to get new subtitles and status
      const projRes = await fetch(`/api/projects/${params.id}`);
      if (projRes.ok) setProject(await projRes.json());
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : t.generationFailed
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t.deleteProjectConfirm)) return;
    await fetch(`/api/projects/${params.id}`, { method: "DELETE" });
    router.push("/");
  }

  if (loading)
    return (
      <div className="flex items-center gap-3 text-surface-400 py-20 justify-center">
        <svg
          className="animate-spin h-5 w-5 text-brand-400"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
          />
        </svg>
        {t.loadingProject}
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
        <Link href="/" className="text-sm text-surface-400 hover:text-surface-200 mt-3 inline-block transition-colors">
          {t.backToProjects}
        </Link>
      </div>
    );

  if (!project)
    return (
      <p className="text-red-400 text-center py-20">{t.projectNotFound}</p>
    );

  const status = statusStyles[project.status] || statusStyles.draft;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/"
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
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${status.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {project.status}
            </span>
            {project.template && (
              <span className="px-2.5 py-0.5 rounded-full bg-surface-800 text-[11px] font-medium text-surface-400">
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

      {/* Video Player */}
      {project.video ? (
        <div className="mb-8">
          <div className="rounded-xl overflow-hidden bg-black border border-surface-800">
            <video
              controls
              className="w-full"
              src={`/api/videos/${project.video.id}`}
            />
          </div>
          <div className="flex items-center gap-4 mt-3 px-1">
            <div className="flex items-center gap-1.5 text-xs text-surface-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
                <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {project.video.fileName}
            </div>
            <span className="text-surface-700">·</span>
            <span className="text-xs text-surface-400">
              {formatDuration(project.video.duration)}
            </span>
            <span className="text-surface-700">·</span>
            <span className="text-xs text-surface-400">
              {project.video.width}x{project.video.height}
            </span>
            <span className="text-surface-700">·</span>
            <span className="text-xs text-surface-400">
              {project.video.fps} fps
            </span>
            <span className="text-surface-700">·</span>
            <span className="text-xs text-surface-400">
              {formatFileSize(project.video.fileSize)}
            </span>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-surface-700 rounded-xl p-12 text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-surface-400 font-medium">{t.noVideoYet}</p>
          <p className="text-xs text-surface-500 mt-1">
            {t.uploadToStart}
          </p>
        </div>
      )}

      {/* Frames section */}
      {project.video && (
        <div className="mb-8">
          {frames.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-100">
                  {t.extractedFrames}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-surface-400 bg-surface-800 px-2.5 py-1 rounded-full font-medium">
                    {frames.length} {t.framesCount}
                  </span>
                  <button
                    onClick={handleExtractFrames}
                    disabled={extracting}
                    className="text-xs text-surface-400 hover:text-surface-200 transition-colors disabled:opacity-50"
                  >
                    {extracting ? t.extractingFrames : t.extractFrames}
                  </button>
                </div>
              </div>
              <p className="text-xs text-surface-500 mb-4">{t.framesDesc}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 stagger-children">
                {frames.map((frame) => (
                  <div
                    key={frame.filename}
                    className="group relative rounded-lg overflow-hidden border border-surface-800 bg-surface-900 hover:border-surface-600 transition-all"
                  >
                    <img
                      src={frame.url}
                      alt={`${t.frameAt} ${formatDuration(frame.index * 2)}`}
                      className="w-full aspect-video object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white font-mono tabular-nums">
                        {formatDuration(frame.index * 2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-surface-700 rounded-xl p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 3v18" />
                </svg>
              </div>
              <p className="text-surface-400 font-medium mb-1">
                {t.noFramesYet}
              </p>
              <p className="text-xs text-surface-500 mb-5">
                {t.noFramesDesc}
              </p>
              {extractError && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm mb-4">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  {extractError}
                </div>
              )}
              <button
                onClick={handleExtractFrames}
                disabled={extracting}
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:bg-surface-800 disabled:text-surface-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-500/25 disabled:hover:shadow-none"
              >
                {extracting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                    </svg>
                    {t.extractingFrames}
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 3v18" />
                    </svg>
                    {t.extractFrames}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Subtitles section */}
      {project.subtitles.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100">
              {t.subtitles}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-surface-400 bg-surface-800 px-2.5 py-1 rounded-full font-medium">
                {project.subtitles.length} {t.segments}
              </span>
              <button
                onClick={handleGenerateSubtitles}
                disabled={generating}
                className="text-xs text-surface-400 hover:text-surface-200 transition-colors disabled:opacity-50"
              >
                {generating ? t.generatingSubtitles : t.regenerateSubtitles}
              </button>
            </div>
          </div>
          <div className="space-y-2 stagger-children">
            {project.subtitles.map((sub) => (
              <div
                key={sub.id}
                className="flex gap-4 border border-surface-800 rounded-xl px-4 py-3 text-sm hover:bg-surface-900/50 transition-colors group"
              >
                <span className="text-surface-500 shrink-0 font-mono text-xs pt-0.5 tabular-nums">
                  {formatDuration(sub.startTime)}
                  <span className="text-surface-700 mx-1">{"\u2192"}</span>
                  {formatDuration(sub.endTime)}
                </span>
                <span className="text-surface-200 leading-relaxed">
                  {sub.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-surface-700 rounded-xl p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.287 48.287 0 005.16-.477c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <p className="text-surface-400 font-medium mb-1">
            {t.noSubtitlesYet}
          </p>
          <p className="text-xs text-surface-500 mb-5">
            {frames.length > 0 ? t.generateSubtitlesDesc : t.noSubtitlesDesc}
          </p>
          {generateError && (
            <div className="flex items-center justify-center gap-2 text-red-400 text-sm mb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {generateError}
            </div>
          )}
          {frames.length > 0 && (
            <button
              onClick={handleGenerateSubtitles}
              disabled={generating}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:bg-surface-800 disabled:text-surface-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-500/25 disabled:hover:shadow-none"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                  </svg>
                  {t.generatingSubtitles}
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                    <path d="M12 18v4M8 22h8" />
                    <path d="M18 10a6 6 0 0 1-12 0" />
                  </svg>
                  {t.generateSubtitles}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
