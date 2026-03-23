"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  onSubtitleUpdated: (updated: Subtitle) => void;
  onSeek: (time: number) => void;
  onSelectSubtitle: (id: string | null) => void;
  t: Record<string, string>;
}

const MIN_DURATION = 0.5;
const HANDLE_WIDTH = 6;
const MIN_BLOCK_TEXT_WIDTH = 60;
const TIMELINE_HEIGHT = 60;
const RULER_HEIGHT = 22;
const ZOOM_STEP = 1.3;
const MAX_ZOOM_SECONDS = 5;

type DragMode = "move" | "resize-left" | "resize-right";

interface DragState {
  subId: string;
  mode: DragMode;
  startX: number;
  origStart: number;
  origEnd: number;
}

function formatRulerTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getTickInterval(visibleDuration: number): { major: number; minor: number | null } {
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

export default function Timeline({
  subtitles,
  videoDuration,
  videoRef,
  activeSubId,
  projectId,
  onSubtitleUpdated,
  onSeek,
  onSelectSubtitle,
  t,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; start: number; end: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; sub: Subtitle } | null>(null);
  const rafRef = useRef<number>(0);

  const visibleDuration = videoDuration / zoom;
  const totalWidth = containerRef.current ? containerRef.current.clientWidth * zoom : 800;

  // Playhead RAF loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function tick() {
      const t = video!.currentTime;
      setPlayheadPos(t);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef]);

  // Sync selected subtitle from parent (list click)
  useEffect(() => {
    if (activeSubId && activeSubId !== selectedId) {
      setSelectedId(activeSubId);
      // Auto-scroll to make the subtitle visible
      const sub = subtitles.find((s) => s.id === activeSubId);
      if (sub && containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const subLeftPx = (sub.startTime / videoDuration) * totalWidth;
        const subRightPx = (sub.endTime / videoDuration) * totalWidth;
        const scrollLeft = container.scrollLeft;

        if (subLeftPx < scrollLeft || subRightPx > scrollLeft + containerWidth) {
          container.scrollLeft = subLeftPx - 40;
        }
      }
    }
  }, [activeSubId, selectedId, subtitles, videoDuration, totalWidth]);

  const timeToX = useCallback(
    (time: number) => (time / videoDuration) * totalWidth,
    [videoDuration, totalWidth]
  );

  const xToTime = useCallback(
    (x: number) => {
      const container = containerRef.current;
      if (!container) return 0;
      const scrollLeft = container.scrollLeft;
      return ((x + scrollLeft) / totalWidth) * videoDuration;
    },
    [totalWidth, videoDuration]
  );

  function snapTime(time: number): number {
    if (!snapEnabled) return time;
    return Math.round(time * 2) / 2; // 0.5s increments
  }

  function clampTime(time: number): number {
    return Math.max(0, Math.min(videoDuration, time));
  }

  // Wheel zoom
  function handleWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // horizontal scroll passthrough
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorTime = ((cursorX + container.scrollLeft) / totalWidth) * videoDuration;

    const newZoom =
      e.deltaY < 0
        ? Math.min(zoom * ZOOM_STEP, videoDuration / MAX_ZOOM_SECONDS)
        : Math.max(zoom / ZOOM_STEP, 1);

    setZoom(newZoom);

    // After zoom, adjust scroll to keep cursor position stable
    requestAnimationFrame(() => {
      if (!container) return;
      const newTotalWidth = container.clientWidth * newZoom;
      const newCursorScrollPos = (cursorTime / videoDuration) * newTotalWidth;
      container.scrollLeft = newCursorScrollPos - cursorX;
    });
  }

  function handleZoomIn() {
    const maxZoom = videoDuration / MAX_ZOOM_SECONDS;
    const newZoom = Math.min(zoom * ZOOM_STEP, maxZoom);
    zoomToPlayhead(newZoom);
  }

  function handleZoomOut() {
    const newZoom = Math.max(zoom / ZOOM_STEP, 1);
    zoomToPlayhead(newZoom);
  }

  function zoomToPlayhead(newZoom: number) {
    setZoom(newZoom);
    const container = containerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      const newTotalWidth = container.clientWidth * newZoom;
      const playheadPx = (playheadPos / videoDuration) * newTotalWidth;
      container.scrollLeft = playheadPx - container.clientWidth / 2;
    });
  }

  // Click on empty area to seek
  function handleTrackClick(e: React.MouseEvent) {
    if (dragState) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-sub-block]")) return;

    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const time = xToTime(clickX);
    onSeek(clampTime(time));
    onSelectSubtitle(null);
    setSelectedId(null);
  }

  // Block click
  function handleBlockClick(sub: Subtitle) {
    setSelectedId(sub.id);
    onSelectSubtitle(sub.id);
    onSeek(sub.startTime);
  }

  // Drag start
  function handlePointerDown(e: React.PointerEvent, sub: Subtitle, mode: DragMode) {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      subId: sub.id,
      mode,
      startX: e.clientX,
      origStart: sub.startTime,
      origEnd: sub.endTime,
    });
    setDragPreview({ id: sub.id, start: sub.startTime, end: sub.endTime });
    setSelectedId(sub.id);
    onSelectSubtitle(sub.id);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const pxPerSec = (containerWidth * zoom) / videoDuration;
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
    }

    setDragPreview({ id: dragState.subId, start: newStart, end: newEnd });
  }

  async function handlePointerUp() {
    if (!dragState || !dragPreview) {
      setDragState(null);
      setDragPreview(null);
      return;
    }

    const { subId, origStart, origEnd } = dragState;
    const { start: newStart, end: newEnd } = dragPreview;

    // Apply optimistic update immediately
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
          // Rollback
          onSubtitleUpdated({ ...sub, startTime: origStart, endTime: origEnd });
        }
      } catch {
        onSubtitleUpdated({ ...sub, startTime: origStart, endTime: origEnd });
      }
    }

    setDragState(null);
    setDragPreview(null);
  }

  // Tooltip
  function handleBlockHover(e: React.MouseEvent, sub: Subtitle) {
    if (dragState) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      sub,
    });
  }

  function handleBlockLeave() {
    setTooltip(null);
  }

  // Compute overlaps
  const overlappingIds = detectOverlaps(
    subtitles.map((s) => {
      if (dragPreview && s.id === dragPreview.id) {
        return { ...s, startTime: dragPreview.start, endTime: dragPreview.end };
      }
      return s;
    })
  );

  // Tick marks
  const containerWidth = containerRef.current?.clientWidth ?? 800;
  const { major, minor } = getTickInterval(visibleDuration);

  const ticks: { time: number; isMajor: boolean }[] = [];
  for (let time = 0; time <= videoDuration; time += minor ?? major) {
    const isMajor = Math.abs(time % major) < 0.001 || Math.abs(time % major - major) < 0.001;
    ticks.push({ time, isMajor });
  }

  const maxZoom = videoDuration / MAX_ZOOM_SECONDS;

  return (
    <div className="hidden lg:block mt-4 select-none">
      {/* Controls bar */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-xs font-medium text-surface-400">{t.timeline || "Timeline"}</span>
        <div className="flex items-center gap-2">
          {/* Snap toggle */}
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md transition-all ${
              snapEnabled
                ? "bg-brand-500/15 text-brand-400 border border-brand-500/25"
                : "text-surface-500 hover:text-surface-300 hover:bg-surface-800"
            }`}
            title={t.snapToGrid || "Snap to grid (0.5s)"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Snap
          </button>

          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="w-6 h-6 flex items-center justify-center rounded text-surface-400 hover:text-surface-200 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title={t.zoomOut || "Zoom out"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
          </button>
          <span className="text-[11px] text-surface-500 font-mono tabular-nums w-8 text-center">
            {zoom.toFixed(1)}x
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= maxZoom}
            className="w-6 h-6 flex items-center justify-center rounded text-surface-400 hover:text-surface-200 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title={t.zoomIn || "Zoom in"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>

      {/* Timeline container */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-hidden border border-surface-800 rounded-lg bg-surface-900/60"
        style={{ height: RULER_HEIGHT + TIMELINE_HEIGHT + 2 }}
        onWheel={handleWheel}
        onPointerMove={dragState ? handlePointerMove : undefined}
        onPointerUp={dragState ? handlePointerUp : undefined}
      >
        <div
          ref={trackRef}
          className="relative"
          style={{ width: containerWidth * zoom, height: RULER_HEIGHT + TIMELINE_HEIGHT }}
          onClick={handleTrackClick}
        >
          {/* Ruler */}
          <div className="absolute top-0 left-0 right-0" style={{ height: RULER_HEIGHT }}>
            {ticks.map(({ time, isMajor }) => {
              const x = timeToX(time);
              return (
                <div key={time} className="absolute top-0" style={{ left: x }}>
                  <div
                    className={`${isMajor ? "bg-surface-600" : "bg-surface-700/60"}`}
                    style={{
                      width: 1,
                      height: isMajor ? RULER_HEIGHT : RULER_HEIGHT * 0.5,
                      marginTop: isMajor ? 0 : RULER_HEIGHT * 0.5,
                    }}
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

          {/* Subtitle blocks */}
          {subtitles.map((sub) => {
            const isPreview = dragPreview?.id === sub.id;
            const start = isPreview ? dragPreview.start : sub.startTime;
            const end = isPreview ? dragPreview.end : sub.endTime;
            const leftPx = timeToX(start);
            const widthPx = timeToX(end) - leftPx;
            const isSelected = selectedId === sub.id;
            const isActive = activeSubId === sub.id;
            const isOverlap = overlappingIds.has(sub.id);
            const isDragging = dragState?.subId === sub.id;

            return (
              <div
                key={sub.id}
                data-sub-block
                className={`absolute rounded-md transition-shadow ${
                  isDragging ? "z-20" : "z-10"
                } ${
                  isOverlap
                    ? "border-red-500/60 bg-red-500/15"
                    : isSelected
                    ? "border-brand-400/60 bg-brand-500/20"
                    : isActive
                    ? "border-brand-500/40 bg-brand-500/12"
                    : "border-surface-600/60 bg-brand-500/8 hover:bg-brand-500/12"
                } border`}
                style={{
                  left: leftPx,
                  width: Math.max(widthPx, 4),
                  top: RULER_HEIGHT + 8,
                  height: TIMELINE_HEIGHT - 16,
                  cursor: isDragging ? "grabbing" : "grab",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBlockClick(sub);
                }}
                onMouseEnter={(e) => handleBlockHover(e, sub)}
                onMouseLeave={handleBlockLeave}
                onPointerDown={(e) => {
                  // Detect if on resize handle
                  const rect = (e.target as HTMLElement).closest("[data-sub-block]")?.getBoundingClientRect();
                  if (!rect) return;
                  const relX = e.clientX - rect.left;
                  if (relX <= HANDLE_WIDTH) {
                    handlePointerDown(e, sub, "resize-left");
                  } else if (relX >= rect.width - HANDLE_WIDTH) {
                    handlePointerDown(e, sub, "resize-right");
                  } else {
                    handlePointerDown(e, sub, "move");
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleBlockClick(sub);
                }}
              >
                {/* Left resize handle visual */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-brand-400/20 rounded-l-md"
                />
                {/* Right resize handle visual */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-brand-400/20 rounded-r-md"
                />
                {/* Text */}
                {widthPx >= MIN_BLOCK_TEXT_WIDTH && (
                  <span className="block px-2 text-[10px] text-surface-300 truncate leading-[36px] pointer-events-none">
                    {sub.text}
                  </span>
                )}
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 z-30 pointer-events-none"
            style={{
              left: timeToX(playheadPos),
              height: RULER_HEIGHT + TIMELINE_HEIGHT,
            }}
          >
            {/* Triangle indicator */}
            <div
              className="absolute -left-[5px] top-0 w-0 h-0"
              style={{
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "6px solid #ef4444",
              }}
            />
            {/* Line */}
            <div className="w-[2px] h-full bg-red-500 -ml-[1px]" />
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && !dragState && (
          <div
            className="absolute z-40 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 pointer-events-none shadow-xl"
            style={{
              left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 300) - 200),
              top: tooltip.y - 60,
            }}
          >
            <p className="text-xs text-surface-200 max-w-[180px] truncate">{tooltip.sub.text}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-surface-400 tabular-nums">
                {formatRulerTime(tooltip.sub.startTime)} → {formatRulerTime(tooltip.sub.endTime)}
              </span>
              <span className="text-[10px] text-surface-500">
                ({(tooltip.sub.endTime - tooltip.sub.startTime).toFixed(1)}s)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
