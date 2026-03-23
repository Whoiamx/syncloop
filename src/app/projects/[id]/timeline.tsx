"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Marker, VideoEdits, SubtitleStyle } from "@/db/schema";

// ─── Types ───────────────────────────────────────────────────────────
interface Subtitle {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface TimelineProps {
  subtitles: Subtitle[];
  videoDuration: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeSubId: string | null;
  projectId: string;
  markers: Marker[];
  videoEdits: VideoEdits;
  videoFileName: string;
  subtitleStyle: SubtitleStyle;
  // Undo/redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Actions
  onSubtitleUpdated: (updated: Subtitle) => void;
  onSubtitleDeleted: (id: string) => void;
  onSeek: (time: number) => void;
  onSelectSubtitle: (id: string | null) => void;
  onMarkersChange: (markers: Marker[]) => void;
  onVideoEditsChange: (edits: VideoEdits) => void;
  onSave: () => void;
  onExport: () => void;
  onStyleOpen: () => void;
  saving: boolean;
  exporting: boolean;
  t: Record<string, string>;
}

// ─── Constants ───────────────────────────────────────────────────────
const MIN_DURATION = 0.5;
const HANDLE_WIDTH = 6;
const MIN_BLOCK_TEXT_WIDTH = 60;
const TRACK_HEIGHT = 44;
const RULER_HEIGHT = 26;
const LABEL_WIDTH = 110;
const MARKER_AREA_HEIGHT = 14;
const ZOOM_STEP = 1.3;
const MAX_ZOOM_SECONDS = 5;

type DragMode = "move" | "resize-left" | "resize-right" | "trim-left" | "trim-right";

interface DragState {
  targetId: string;
  mode: DragMode;
  startX: number;
  origStart: number;
  origEnd: number;
}

// ─── Utilities ───────────────────────────────────────────────────────
function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

function formatRulerTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getTickInterval(visibleDuration: number): { major: number; minor: number } {
  if (visibleDuration <= 10) return { major: 1, minor: 0.5 };
  if (visibleDuration <= 30) return { major: 5, minor: 1 };
  if (visibleDuration <= 60) return { major: 10, minor: 5 };
  if (visibleDuration <= 180) return { major: 30, minor: 10 };
  return { major: 60, minor: 30 };
}

function detectOverlaps(subtitles: Subtitle[]): Set<string> {
  const overlapping = new Set<string>();
  const sorted = [...subtitles].sort((a, b) => a.startTime - b.startTime);
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].startTime >= sorted[i].endTime) break;
      overlapping.add(sorted[i].id);
      overlapping.add(sorted[j].id);
    }
  }
  return overlapping;
}

function isInDeletedSection(time: number, deletedSections: { start: number; end: number }[]): boolean {
  return deletedSections.some((s) => time >= s.start && time < s.end);
}

// ─── SVG Icons ───────────────────────────────────────────────────────
const icons = {
  undo: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13" />
    </svg>
  ),
  redo: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016.69 3L21 13" />
    </svg>
  ),
  scissors: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    </svg>
  ),
  play: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
  ),
  pause: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
  ),
  skipBack: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  ),
  skipForward: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  ),
  eye: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  marker: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M5 12h14" />
    </svg>
  ),
  save: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  exportIcon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  style: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
};

// ─── Toolbar Button ──────────────────────────────────────────────────
function TBtn({
  onClick,
  disabled,
  active,
  title,
  children,
  className = "",
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${
        active
          ? "bg-brand-500/15 text-brand-400"
          : disabled
          ? "text-surface-600 cursor-not-allowed"
          : "text-surface-400 hover:text-surface-200 hover:bg-surface-800"
      } ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Main Timeline Component ─────────────────────────────────────────
export default function Timeline({
  subtitles,
  videoDuration,
  videoRef,
  activeSubId,
  projectId,
  markers,
  videoEdits,
  videoFileName,
  subtitleStyle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSubtitleUpdated,
  onSubtitleDeleted,
  onSeek,
  onSelectSubtitle,
  onMarkersChange,
  onVideoEditsChange,
  onSave,
  onExport,
  onStyleOpen,
  saving,
  exporting,
  t,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; start: number; end: number } | null>(null);
  const [captionsVisible, setCaptionsVisible] = useState(true);
  const [videoTrackVisible, setVideoTrackVisible] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; time: number } | null>(null);
  const rafRef = useRef<number>(0);

  const visibleDuration = videoDuration / zoom;
  const containerWidth = containerRef.current?.clientWidth ?? 800;
  const trackAreaWidth = containerWidth - LABEL_WIDTH;
  const totalWidth = trackAreaWidth * zoom;

  const trimStart = videoEdits.trimStart ?? 0;
  const trimEnd = videoEdits.trimEnd ?? videoDuration;

  // ─── Playhead RAF ──────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function tick() {
      setPlayheadPos(video!.currentTime);
      setIsPlaying(!video!.paused);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef]);

  // ─── Sync selection from parent ────────────────────────────────────
  useEffect(() => {
    if (activeSubId && activeSubId !== selectedId) {
      setSelectedId(activeSubId);
      setSelectedSection(null);
    }
  }, [activeSubId, selectedId]);

  // ─── Coordinate converters ─────────────────────────────────────────
  const timeToX = useCallback(
    (time: number) => (time / videoDuration) * totalWidth,
    [videoDuration, totalWidth]
  );

  const xToTime = useCallback(
    (xRelToTrack: number) => {
      const scrollLeft = containerRef.current?.scrollLeft ?? 0;
      return ((xRelToTrack + scrollLeft) / totalWidth) * videoDuration;
    },
    [totalWidth, videoDuration]
  );

  function snapTime(time: number): number {
    if (!snapEnabled) return time;
    return Math.round(time * 2) / 2;
  }

  function clampTime(time: number): number {
    return Math.max(0, Math.min(videoDuration, time));
  }

  // ─── Playback controls ─────────────────────────────────────────────
  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }

  function skipBack() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 5);
  }

  function skipForward() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(videoDuration, video.currentTime + 5);
  }

  // ─── Zoom ──────────────────────────────────────────────────────────
  function handleWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left - LABEL_WIDTH;
    const cursorTime = ((cursorX + container.scrollLeft) / totalWidth) * videoDuration;

    const newZoom =
      e.deltaY < 0
        ? Math.min(zoom * ZOOM_STEP, videoDuration / MAX_ZOOM_SECONDS)
        : Math.max(zoom / ZOOM_STEP, 1);

    setZoom(newZoom);

    requestAnimationFrame(() => {
      if (!container) return;
      const newTotalWidth = (container.clientWidth - LABEL_WIDTH) * newZoom;
      const newCursorScrollPos = (cursorTime / videoDuration) * newTotalWidth;
      container.scrollLeft = newCursorScrollPos - cursorX;
    });
  }

  function handleZoomIn() {
    const maxZoom = videoDuration / MAX_ZOOM_SECONDS;
    const newZoom = Math.min(zoom * ZOOM_STEP, maxZoom);
    setZoom(newZoom);
  }

  function handleZoomOut() {
    const newZoom = Math.max(zoom / ZOOM_STEP, 1);
    setZoom(newZoom);
  }

  // ─── Click on track to seek ────────────────────────────────────────
  function handleTrackClick(e: React.MouseEvent) {
    if (dragState) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-sub-block]") || target.closest("[data-marker]")) return;

    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const time = xToTime(clickX);
    onSeek(clampTime(time));
    onSelectSubtitle(null);
    setSelectedId(null);
    setSelectedSection(null);
  }

  // ─── Context menu for markers ──────────────────────────────────────
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const time = clampTime(xToTime(clickX));
    setContextMenu({ x: e.clientX, y: e.clientY, time });
  }

  function addMarker(time: number) {
    const id = crypto.randomUUID();
    const newMarker: Marker = { id, time, shape: "circle", color: "#f59e0b" };
    onMarkersChange([...markers, newMarker]);
    setContextMenu(null);
  }

  function deleteMarker(id: string) {
    onMarkersChange(markers.filter((m) => m.id !== id));
  }

  function updateMarkerColor(id: string, color: string) {
    onMarkersChange(markers.map((m) => (m.id === id ? { ...m, color } : m)));
  }

  function toggleMarkerShape(id: string) {
    onMarkersChange(
      markers.map((m) =>
        m.id === id ? { ...m, shape: m.shape === "circle" ? "square" : "circle" } : m
      )
    );
  }

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  // ─── Subtitle block interactions ───────────────────────────────────
  function handleBlockClick(sub: Subtitle) {
    setSelectedId(sub.id);
    setSelectedSection(null);
    onSelectSubtitle(sub.id);
    onSeek(sub.startTime);
  }

  function handlePointerDown(e: React.PointerEvent, sub: Subtitle, mode: DragMode) {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      targetId: sub.id,
      mode,
      startX: e.clientX,
      origStart: sub.startTime,
      origEnd: sub.endTime,
    });
    setDragPreview({ id: sub.id, start: sub.startTime, end: sub.endTime });
    setSelectedId(sub.id);
    setSelectedSection(null);
    onSelectSubtitle(sub.id);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState || !containerRef.current) return;

    const pxPerSec = totalWidth / videoDuration;
    const deltaPx = e.clientX - dragState.startX;
    const deltaSec = deltaPx / pxPerSec;

    let newStart = dragState.origStart;
    let newEnd = dragState.origEnd;
    const duration = dragState.origEnd - dragState.origStart;

    if (dragState.mode === "move") {
      newStart = clampTime(snapTime(dragState.origStart + deltaSec));
      newEnd = newStart + duration;
      if (newEnd > videoDuration) {
        newEnd = videoDuration;
        newStart = newEnd - duration;
      }
      if (newStart < 0) {
        newStart = 0;
        newEnd = duration;
      }
    } else if (dragState.mode === "resize-left") {
      newStart = clampTime(snapTime(dragState.origStart + deltaSec));
      if (newEnd - newStart < MIN_DURATION) newStart = newEnd - MIN_DURATION;
    } else if (dragState.mode === "resize-right") {
      newEnd = clampTime(snapTime(dragState.origEnd + deltaSec));
      if (newEnd - newStart < MIN_DURATION) newEnd = newStart + MIN_DURATION;
    } else if (dragState.mode === "trim-left") {
      const newTrimStart = clampTime(snapTime(dragState.origStart + deltaSec));
      onVideoEditsChange({ ...videoEdits, trimStart: Math.max(0, newTrimStart) });
      return;
    } else if (dragState.mode === "trim-right") {
      const newTrimEnd = clampTime(snapTime(dragState.origEnd + deltaSec));
      onVideoEditsChange({ ...videoEdits, trimEnd: Math.min(videoDuration, newTrimEnd) });
      return;
    }

    setDragPreview({ id: dragState.targetId, start: newStart, end: newEnd });
  }

  async function handlePointerUp() {
    if (!dragState || !dragPreview) {
      setDragState(null);
      setDragPreview(null);
      return;
    }

    // Trim handles don't need API calls
    if (dragState.mode === "trim-left" || dragState.mode === "trim-right") {
      setDragState(null);
      setDragPreview(null);
      return;
    }

    const { targetId: subId, origStart, origEnd } = dragState;
    const { start: newStart, end: newEnd } = dragPreview;

    const sub = subtitles.find((s) => s.id === subId);
    if (sub && (Math.abs(newStart - origStart) > 0.01 || Math.abs(newEnd - origEnd) > 0.01)) {
      onSubtitleUpdated({ ...sub, startTime: newStart, endTime: newEnd });

      try {
        const res = await fetch(`/api/projects/${projectId}/subtitles/${subId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime: Math.round(newStart * 100) / 100,
            endTime: Math.round(newEnd * 100) / 100,
          }),
        });
        if (!res.ok) {
          onSubtitleUpdated({ ...sub, startTime: origStart, endTime: origEnd });
        }
      } catch {
        onSubtitleUpdated({ ...sub, startTime: origStart, endTime: origEnd });
      }
    }

    setDragState(null);
    setDragPreview(null);
  }

  // ─── Split at playhead ─────────────────────────────────────────────
  function handleSplit() {
    const time = playheadPos;
    if (time <= 0.1 || time >= videoDuration - 0.1) return;
    if (isInDeletedSection(time, videoEdits.deletedSections)) return;

    // Find the section that contains the playhead and split it
    // This adds the playhead position as a split point by inserting a deleted section of 0 length
    // Actually, split means we add a boundary. For delete, user selects a section then deletes.
    // Let's keep it simple: split creates a visual boundary, and user can delete a section between splits.
    // Implementation: we track split points, and sections between splits can be deleted.

    // For simplicity, let's just mark split points as tiny deleted sections to create visual gaps
    // Actually, let's maintain a separate concept. Splits create segments, user can toggle-delete segments.

    // Simple approach: We'll add the split time as a split point.
    // Sections are defined as: [0, split1], [split1, split2], ..., [splitN, duration]
    // Each section can be deleted or not.

    // Store splits in videoEdits.deletedSections as the actual deleted intervals.
    // When user splits, we mark the point. Then they can select and delete.
    // For UX: split inserts a thin visual line at playhead position.
    // The user then can click on a segment and delete it.

    // For now: Add a marker at split position and let user delete sections manually
    // by selecting a region. Simpler: add the playhead time as a marker for visual reference,
    // and add a deleted section by selecting between two markers/start/end.

    // Most practical: When user clicks split, we add a split-point marker.
    // When user clicks delete, we delete the section between the two nearest split points around playhead.

    // Let's store split points alongside deleted sections:
    const splitMarker: Marker = {
      id: crypto.randomUUID(),
      time,
      shape: "square",
      color: "#ef4444",
      label: "Split",
    };
    onMarkersChange([...markers, splitMarker]);
  }

  // ─── Delete selected ───────────────────────────────────────────────
  function handleDelete() {
    if (selectedId) {
      // Delete selected subtitle
      onSubtitleDeleted(selectedId);
      setSelectedId(null);
      return;
    }

    // Delete video section around playhead (between nearest split markers)
    const splitTimes = markers
      .filter((m) => m.label === "Split")
      .map((m) => m.time)
      .sort((a, b) => a - b);

    const allBounds = [0, ...splitTimes, videoDuration];
    let sectionStart = 0;
    let sectionEnd = videoDuration;

    for (let i = 0; i < allBounds.length - 1; i++) {
      if (playheadPos >= allBounds[i] && playheadPos < allBounds[i + 1]) {
        sectionStart = allBounds[i];
        sectionEnd = allBounds[i + 1];
        break;
      }
    }

    // Check not already deleted
    const alreadyDeleted = videoEdits.deletedSections.some(
      (s) => Math.abs(s.start - sectionStart) < 0.01 && Math.abs(s.end - sectionEnd) < 0.01
    );
    if (alreadyDeleted) return;

    onVideoEditsChange({
      ...videoEdits,
      deletedSections: [...videoEdits.deletedSections, { start: sectionStart, end: sectionEnd }],
    });
  }

  // ─── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // ─── Overlap detection ─────────────────────────────────────────────
  const overlappingIds = detectOverlaps(
    subtitles.map((s) => {
      if (dragPreview && s.id === dragPreview.id) {
        return { ...s, startTime: dragPreview.start, endTime: dragPreview.end };
      }
      return s;
    })
  );

  // ─── Tick marks ────────────────────────────────────────────────────
  const { major, minor } = getTickInterval(visibleDuration);
  const ticks: { time: number; isMajor: boolean }[] = [];
  for (let time = 0; time <= videoDuration; time += minor) {
    const isMajor = Math.abs(time % major) < 0.001 || Math.abs(time % major - major) < 0.001;
    ticks.push({ time, isMajor });
  }

  const maxZoom = videoDuration / MAX_ZOOM_SECONDS;
  const totalTimelineHeight = RULER_HEIGHT + MARKER_AREA_HEIGHT + TRACK_HEIGHT * 2 + 8;

  return (
    <div className="hidden lg:block mt-4 select-none">
      {/* ─── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-1.5 px-1 py-1 bg-surface-900/80 border border-surface-800 rounded-lg">
        {/* Undo/Redo */}
        <TBtn onClick={onUndo} disabled={!canUndo} title={`${t.undo || "Undo"} (Ctrl+Z)`}>{icons.undo}</TBtn>
        <TBtn onClick={onRedo} disabled={!canRedo} title={`${t.redo || "Redo"} (Ctrl+Shift+Z)`}>{icons.redo}</TBtn>

        <div className="w-px h-5 bg-surface-700 mx-1" />

        {/* Edit tools */}
        <TBtn onClick={handleSplit} title={t.splitAtPlayhead || "Split at playhead"}>{icons.scissors}</TBtn>
        <TBtn onClick={handleDelete} title={t.deleteSelected || "Delete selected"}>{icons.trash}</TBtn>

        <div className="w-px h-5 bg-surface-700 mx-1" />

        {/* Snap */}
        <TBtn onClick={() => setSnapEnabled(!snapEnabled)} active={snapEnabled} title={t.snapToGrid || "Snap to grid"}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </TBtn>

        {/* Zoom */}
        <TBtn onClick={handleZoomOut} disabled={zoom <= 1} title={t.zoomOut || "Zoom out"}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
        </TBtn>
        <span className="text-[10px] text-surface-500 font-mono tabular-nums w-7 text-center">{zoom.toFixed(1)}x</span>
        <TBtn onClick={handleZoomIn} disabled={zoom >= maxZoom} title={t.zoomIn || "Zoom in"}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        </TBtn>

        <div className="w-px h-5 bg-surface-700 mx-1" />

        {/* Playback */}
        <TBtn onClick={skipBack} title={t.skipBack || "Back 5s"}>{icons.skipBack}</TBtn>
        <TBtn onClick={togglePlay} title={t.playPause || "Play/Pause"}>
          {isPlaying ? icons.pause : icons.play}
        </TBtn>
        <TBtn onClick={skipForward} title={t.skipForward || "Forward 5s"}>{icons.skipForward}</TBtn>

        {/* Timecode */}
        <span className="text-[11px] font-mono text-surface-300 tabular-nums ml-1">
          {formatTimecode(playheadPos)}
        </span>
        <span className="text-[10px] text-surface-600 mx-0.5">/</span>
        <span className="text-[11px] font-mono text-surface-500 tabular-nums">
          {formatTimecode(videoDuration)}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Subtitle style */}
        <TBtn onClick={onStyleOpen} title={t.subtitleStyle || "Subtitle Style"}>{icons.style}</TBtn>

        <div className="w-px h-5 bg-surface-700 mx-1" />

        {/* Save & Export */}
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100 disabled:opacity-50 border border-surface-700"
        >
          {saving ? (
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" /></svg>
          ) : icons.save}
          {t.saveChanges || "Save"}
        </button>
        <button
          onClick={onExport}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all bg-brand-500 text-white hover:bg-brand-400 disabled:opacity-50"
        >
          {exporting ? (
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" /></svg>
          ) : icons.exportIcon}
          {t.exportVideo || "Export video"}
        </button>
      </div>

      {/* ─── Timeline Container ───────────────────────────────────── */}
      <div className="flex border border-surface-800 rounded-lg bg-surface-900/60 overflow-hidden">
        {/* ─── Track Labels (left) ────────────────────────────────── */}
        <div className="shrink-0 border-r border-surface-800" style={{ width: LABEL_WIDTH }}>
          {/* Ruler spacer + marker area */}
          <div style={{ height: RULER_HEIGHT + MARKER_AREA_HEIGHT }} className="border-b border-surface-800/50" />

          {/* Captions track label */}
          <div
            className="flex items-center gap-1.5 px-2 border-b border-surface-800/50"
            style={{ height: TRACK_HEIGHT }}
          >
            <span className="text-[10px] text-surface-600 font-mono w-3">2</span>
            <button
              onClick={() => setCaptionsVisible(!captionsVisible)}
              className="text-surface-500 hover:text-surface-300 transition-colors"
              title={captionsVisible ? (t.trackVisible || "Visible") : (t.trackHidden || "Hidden")}
            >
              {captionsVisible ? icons.eye : icons.eyeOff}
            </button>
            <span className="text-[11px] text-surface-400 font-medium truncate">
              {t.captionsTrack || "Captions"}
            </span>
          </div>

          {/* Video track label */}
          <div
            className="flex items-center gap-1.5 px-2"
            style={{ height: TRACK_HEIGHT }}
          >
            <span className="text-[10px] text-surface-600 font-mono w-3">1</span>
            <button
              onClick={() => setVideoTrackVisible(!videoTrackVisible)}
              className="text-surface-500 hover:text-surface-300 transition-colors"
              title={videoTrackVisible ? (t.trackVisible || "Visible") : (t.trackHidden || "Hidden")}
            >
              {videoTrackVisible ? icons.eye : icons.eyeOff}
            </button>
            <span className="text-[11px] text-surface-400 font-medium truncate">
              {t.videoTrack || "Video"}
            </span>
          </div>
        </div>

        {/* ─── Scrollable track area ──────────────────────────────── */}
        <div
          ref={containerRef}
          className="relative overflow-x-auto overflow-y-hidden flex-1"
          style={{ height: totalTimelineHeight }}
          onWheel={handleWheel}
          onPointerMove={dragState ? handlePointerMove : undefined}
          onPointerUp={dragState ? handlePointerUp : undefined}
          onContextMenu={handleContextMenu}
        >
          <div
            ref={trackRef}
            className="relative"
            style={{ width: totalWidth, height: totalTimelineHeight }}
            onClick={handleTrackClick}
          >
            {/* ─── Ruler ──────────────────────────────────────────── */}
            <div className="absolute top-0 left-0 right-0" style={{ height: RULER_HEIGHT }}>
              {ticks.map(({ time, isMajor }) => {
                const x = timeToX(time);
                return (
                  <div key={time} className="absolute top-0" style={{ left: x }}>
                    <div
                      className={isMajor ? "bg-surface-600" : "bg-surface-700/60"}
                      style={{ width: 1, height: isMajor ? RULER_HEIGHT : RULER_HEIGHT * 0.5, marginTop: isMajor ? 0 : RULER_HEIGHT * 0.5 }}
                    />
                    {isMajor && (
                      <span className="absolute text-[9px] text-surface-500 font-mono tabular-nums whitespace-nowrap" style={{ top: 2, left: 4 }}>
                        {formatRulerTime(time)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── Markers area ────────────────────────────────────── */}
            <div className="absolute left-0 right-0" style={{ top: RULER_HEIGHT, height: MARKER_AREA_HEIGHT }}>
              {markers.map((marker) => {
                const x = timeToX(marker.time);
                return (
                  <div
                    key={marker.id}
                    data-marker
                    className="absolute cursor-pointer group"
                    style={{ left: x - 5, top: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(marker.time);
                    }}
                    title={`${formatRulerTime(marker.time)}${marker.label ? ` — ${marker.label}` : ""}`}
                  >
                    {marker.shape === "circle" ? (
                      <svg width="10" height="10" viewBox="0 0 10 10">
                        <circle cx="5" cy="5" r="4" fill="none" stroke={marker.color} strokeWidth="1.5" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10">
                        <rect x="1" y="1" width="8" height="8" fill="none" stroke={marker.color} strokeWidth="1.5" />
                      </svg>
                    )}
                    {/* Marker hover actions */}
                    <div className="hidden group-hover:flex absolute top-[-2px] left-3 items-center gap-0.5 bg-surface-800 border border-surface-700 rounded px-1 py-0.5 z-50">
                      <input
                        type="color"
                        value={marker.color}
                        onChange={(e) => { e.stopPropagation(); updateMarkerColor(marker.id, e.target.value); }}
                        className="w-3 h-3 cursor-pointer bg-transparent border-0 p-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleMarkerShape(marker.id); }}
                        className="text-surface-400 hover:text-surface-200 text-[8px]"
                        title={t.markerShape || "Shape"}
                      >
                        {marker.shape === "circle" ? "○→□" : "□→○"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMarker(marker.id); }}
                        className="text-red-400 hover:text-red-300 text-[8px]"
                        title={t.deleteMarker || "Delete"}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Captions Track ──────────────────────────────────── */}
            {captionsVisible && (
              <div
                className="absolute left-0 right-0 border-b border-surface-800/50"
                style={{ top: RULER_HEIGHT + MARKER_AREA_HEIGHT, height: TRACK_HEIGHT }}
              >
                {subtitles.map((sub) => {
                  const isPreview = dragPreview?.id === sub.id;
                  const start = isPreview ? dragPreview.start : sub.startTime;
                  const end = isPreview ? dragPreview.end : sub.endTime;
                  const leftPx = timeToX(start);
                  const widthPx = timeToX(end) - leftPx;
                  const isSelected = selectedId === sub.id;
                  const isActive = activeSubId === sub.id;
                  const isOverlap = overlappingIds.has(sub.id);
                  const isDragging = dragState?.targetId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      data-sub-block
                      className={`absolute rounded transition-shadow ${
                        isDragging ? "z-20" : "z-10"
                      } ${
                        isOverlap
                          ? "border-red-500/60 bg-red-500/15"
                          : isSelected
                          ? "border-brand-400/60 bg-brand-500/25"
                          : isActive
                          ? "border-brand-500/40 bg-brand-500/15"
                          : "border-surface-600/50 bg-brand-500/10 hover:bg-brand-500/15"
                      } border`}
                      style={{
                        left: leftPx,
                        width: Math.max(widthPx, 4),
                        top: 4,
                        height: TRACK_HEIGHT - 8,
                        cursor: isDragging ? "grabbing" : "grab",
                      }}
                      onClick={(e) => { e.stopPropagation(); handleBlockClick(sub); }}
                      onPointerDown={(e) => {
                        const rect = (e.target as HTMLElement).closest("[data-sub-block]")?.getBoundingClientRect();
                        if (!rect) return;
                        const relX = e.clientX - rect.left;
                        if (relX <= HANDLE_WIDTH) handlePointerDown(e, sub, "resize-left");
                        else if (relX >= rect.width - HANDLE_WIDTH) handlePointerDown(e, sub, "resize-right");
                        else handlePointerDown(e, sub, "move");
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") handleBlockClick(sub); }}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-brand-400/20 rounded-l" />
                      <div className="absolute right-0 top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-brand-400/20 rounded-r" />
                      {widthPx >= MIN_BLOCK_TEXT_WIDTH && (
                        <span className="block px-2 text-[10px] text-surface-300 truncate leading-[28px] pointer-events-none">
                          {sub.text}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Video Track ─────────────────────────────────────── */}
            {videoTrackVisible && (
              <div
                className="absolute left-0 right-0"
                style={{ top: RULER_HEIGHT + MARKER_AREA_HEIGHT + TRACK_HEIGHT, height: TRACK_HEIGHT }}
              >
                {/* Full video bar */}
                <div
                  className="absolute rounded bg-teal-500/12 border border-teal-500/25"
                  style={{ left: 0, width: totalWidth, top: 4, height: TRACK_HEIGHT - 8 }}
                >
                  <span className="block px-2 text-[10px] text-teal-300/70 truncate leading-[28px] pointer-events-none">
                    {videoFileName}
                  </span>
                </div>

                {/* Trim overlay — darkened areas outside trim range */}
                {trimStart > 0 && (
                  <div
                    className="absolute top-0 bg-black/50 z-10"
                    style={{ left: 0, width: timeToX(trimStart), height: TRACK_HEIGHT }}
                  />
                )}
                {trimEnd < videoDuration && (
                  <div
                    className="absolute top-0 bg-black/50 z-10"
                    style={{ left: timeToX(trimEnd), width: totalWidth - timeToX(trimEnd), height: TRACK_HEIGHT }}
                  />
                )}

                {/* Trim handles */}
                <div
                  className="absolute top-0 w-[5px] bg-amber-400/70 hover:bg-amber-400 cursor-col-resize z-20 rounded-l"
                  style={{ left: timeToX(trimStart), height: TRACK_HEIGHT }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    setDragState({
                      targetId: "__trim__",
                      mode: "trim-left",
                      startX: e.clientX,
                      origStart: trimStart,
                      origEnd: trimEnd,
                    });
                  }}
                />
                <div
                  className="absolute top-0 w-[5px] bg-amber-400/70 hover:bg-amber-400 cursor-col-resize z-20 rounded-r"
                  style={{ left: timeToX(trimEnd) - 5, height: TRACK_HEIGHT }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    setDragState({
                      targetId: "__trim__",
                      mode: "trim-right",
                      startX: e.clientX,
                      origStart: trimStart,
                      origEnd: trimEnd,
                    });
                  }}
                />

                {/* Deleted sections overlay */}
                {videoEdits.deletedSections.map((section, i) => (
                  <div
                    key={i}
                    className="absolute top-0 z-15 bg-red-500/15 border-x border-red-500/30"
                    style={{
                      left: timeToX(section.start),
                      width: timeToX(section.end) - timeToX(section.start),
                      height: TRACK_HEIGHT,
                    }}
                  >
                    <div className="flex items-center justify-center h-full">
                      <span className="text-[9px] text-red-400/60 font-mono">CUT</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Playhead ────────────────────────────────────────── */}
            <div
              className="absolute top-0 z-30 pointer-events-none"
              style={{ left: timeToX(playheadPos), height: totalTimelineHeight }}
            >
              <div
                className="absolute -left-[5px] top-0 w-0 h-0"
                style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid #ef4444" }}
              />
              <div className="w-[2px] h-full bg-red-500 -ml-[1px]" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Context Menu ─────────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-surface-800 border border-surface-700 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-surface-300 hover:bg-surface-700 hover:text-surface-100 flex items-center gap-2"
            onClick={() => addMarker(contextMenu.time)}
          >
            {icons.marker}
            {t.addMarker || "Add marker"} ({formatRulerTime(contextMenu.time)})
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-surface-300 hover:bg-surface-700 hover:text-surface-100 flex items-center gap-2"
            onClick={() => { onSeek(contextMenu.time); setContextMenu(null); }}
          >
            {icons.play}
            Seek to {formatRulerTime(contextMenu.time)}
          </button>
        </div>
      )}
    </div>
  );
}
