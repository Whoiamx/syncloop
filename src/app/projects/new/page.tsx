"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import { formatFileSize, formatDuration } from "@/lib/format";

type InputMode = "upload" | "record";
type RecorderState = "idle" | "recording" | "paused" | "recorded";

export default function NewProject() {
  const { t } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<"tutorial" | "product_demo">("tutorial");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  // Screen recorder state
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedRef = useRef(0);
  const [isSupported, setIsSupported] = useState(true);
  const [startingCapture, setStartingCapture] = useState(false);

  // Check browser support
  useEffect(() => {
    const hasGetDisplayMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    const hasMediaRecorder = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm");
    setIsSupported(hasGetDisplayMedia && hasMediaRecorder);
  }, []);

  // Create/revoke object URL for video preview
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFileUrl(null);
      setVideoDuration(null);
    }
  }, [file]);

  // Cleanup stream and recorder on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => {
        const next = s + 1;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
  }

  const handleFile = useCallback(
    (f: File) => {
      const allowedTypes = ["video/mp4", "video/webm"];
      if (!allowedTypes.includes(f.type)) {
        setError(t.invalidFileType);
        return;
      }
      const maxSize = 500 * 1024 * 1024;
      if (f.size > maxSize) {
        setError(t.fileTooLarge);
        return;
      }
      setFile(f);
      setVideoDuration(null);
      setError("");
      if (!title) {
        setTitle(f.name.replace(/\.[^.]+$/, ""));
      }
    },
    [title, t]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleModeChange(mode: InputMode) {
    if (mode === inputMode) return;
    // Stop any active recording
    if (recorderState === "recording" || recorderState === "paused") {
      stopStream();
      stopTimer();
    }
    setFile(null);
    setError("");
    setRecorderState("idle");
    setElapsedSeconds(0);
    chunksRef.current = [];
    setInputMode(mode);
  }

  // Screen recording functions
  async function handleStartCapture() {
    if (startingCapture) return;
    setStartingCapture(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      streamRef.current = stream;

      // Listen for native "Stop sharing" button
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        handleStreamEnded();
      });

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }

      // Start recording immediately — no previewing step
      startRecordingFromStream(stream);
    } catch {
      // User cancelled the dialog — stay idle, no error
    } finally {
      setStartingCapture(false);
    }
  }

  function handleStreamEnded() {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      stopTimer();
    } else if (streamRef.current) {
      stopStream();
      setRecorderState("idle");
    }
  }

  function startRecordingFromStream(stream: MediaStream) {
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      // Clear BOTH refs BEFORE stopping tracks to prevent handleStreamEnded
      // from re-firing and resetting state to "idle"
      mediaRecorderRef.current = null;
      const stream = streamRef.current;
      streamRef.current = null;

      // Now safe to stop tracks — handleStreamEnded will see both refs null and do nothing
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const now = new Date();
      const ts = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") + "-" +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");
      const recordedFile = new File([blob], `screen-recording-${ts}.webm`, { type: "video/webm" });

      // Validate size
      const maxSize = 500 * 1024 * 1024;
      if (recordedFile.size > maxSize) {
        setError(t.fileTooLarge);
        setRecorderState("idle");
        return;
      }

      setFile(recordedFile);
      // Use elapsed timer as duration — WebM blobs from MediaRecorder
      // often lack duration metadata (Infinity/NaN from video.duration)
      setVideoDuration(elapsedRef.current);
      if (!title) setTitle(t.screenRecordingTitle);
      setRecorderState("recorded");
    };

    recorder.start(1000); // Collect data every second
    setElapsedSeconds(0);
    startTimer();
    setRecorderState("recording");
  }

  function handlePauseRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      stopTimer();
      setRecorderState("paused");
    }
  }

  function handleResumeRecording() {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      startTimer();
      setRecorderState("recording");
    }
  }

  function handleStopRecording() {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function handleRecordAgain() {
    setFile(null);
    setError("");
    setRecorderState("idle");
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    chunksRef.current = [];
  }

  function formatTimer(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setUploading(true);
    setError("");

    try {
      setProgress(t.creatingProject);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), template }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.failedCreate);
      }

      const project = await res.json();

      setProgress(t.uploadingVideo);
      const formData = new FormData();
      formData.append("video", file);

      const uploadRes = await fetch(`/api/projects/${project.id}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || t.failedUpload);
      }

      // If server got duration 0 (common with WebM), send browser-detected duration as fallback
      const uploadData = await uploadRes.json();
      if ((!uploadData.duration || uploadData.duration <= 0) && videoDuration && videoDuration > 0) {
        await fetch(`/api/videos/${uploadData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duration: videoDuration }),
        }).catch(() => {}); // Non-critical, don't block navigation
      }

      setProgress(t.done);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.somethingWrong);
      setUploading(false);
    }
  }

  const isRecording = recorderState === "recording" || recorderState === "paused";

  const templates = [
    {
      id: "tutorial" as const,
      label: t.tutorialLabel,
      description: t.tutorialDesc,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          <path d="M8 7h8M8 11h6" />
        </svg>
      ),
    },
    {
      id: "product_demo" as const,
      label: t.productDemoLabel,
      description: t.productDemoDesc,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
          <path d="M10 9l4 2-4 2V9z" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-200 mb-6 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {t.backToProjects}
      </Link>

      <h1 className="text-2xl font-bold text-surface-100 tracking-tight mb-1">
        {t.newProjectTitle}
      </h1>
      <p className="text-sm text-surface-400 mb-8">
        {t.newProjectDesc}
      </p>

      <form onSubmit={handleSubmit} className="space-y-7">
        {/* Video Section */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            {t.videoLabel}
          </label>

          {/* Tab Selector */}
          {!uploading && (
            <div className="flex mb-3 bg-surface-900 rounded-lg p-1 border border-surface-700">
              <button
                type="button"
                disabled={isRecording}
                onClick={() => handleModeChange("upload")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  inputMode === "upload"
                    ? "bg-surface-800 text-surface-100 shadow-sm"
                    : "text-surface-400 hover:text-surface-300"
                } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                {t.uploadFileTab}
              </button>
              <button
                type="button"
                disabled={isRecording}
                onClick={() => handleModeChange("record")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  inputMode === "record"
                    ? "bg-surface-800 text-surface-100 shadow-sm"
                    : "text-surface-400 hover:text-surface-300"
                } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                </svg>
                {t.recordScreenTab}
              </button>
            </div>
          )}

          {/* Upload Mode */}
          {inputMode === "upload" && (
            <>
              {file && fileUrl ? (
                <div className="rounded-xl border border-surface-700 overflow-hidden bg-surface-900">
                  <div className="relative rounded-t-xl overflow-hidden bg-black">
                    <video
                      ref={previewVideoRef}
                      src={fileUrl}
                      controls
                      className="w-full max-h-[280px] object-contain"
                      onLoadedMetadata={(e) => {
                        const video = e.currentTarget;
                        const dur = video.duration;
                        if (isFinite(dur) && dur > 0) {
                          setVideoDuration(dur);
                        } else {
                          // WebM files may report Infinity — seek to end to force duration calculation
                          const onSeeked = () => {
                            video.removeEventListener("seeked", onSeeked);
                            const resolvedDur = video.duration;
                            if (isFinite(resolvedDur) && resolvedDur > 0) {
                              setVideoDuration(resolvedDur);
                            }
                            video.currentTime = 0;
                          };
                          video.addEventListener("seeked", onSeeked);
                          video.currentTime = 1e10;
                        }
                      }}
                    />
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400">
                          <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-200 truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-surface-400 mt-0.5">
                          <span>{formatFileSize(file.size)}</span>
                          {videoDuration !== null && (
                            <>
                              <span className="text-surface-600">&middot;</span>
                              <span>{formatDuration(videoDuration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-xs text-surface-400 hover:text-surface-200 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 transition-all shrink-0"
                    >
                      {t.clickToChange}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-brand-400 bg-brand-500/5"
                      : "border-surface-700 hover:border-surface-500 hover:bg-surface-900/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-surface-300 font-medium">
                    {t.dropVideo}{" "}
                    <span className="text-brand-400">{t.browse}</span>
                  </p>
                  <p className="text-xs text-surface-500 mt-1.5">
                    {t.supportedFormats}
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
                className="hidden"
              />
            </>
          )}

          {/* Record Mode */}
          {inputMode === "record" && (
            <>
              {/* Recorded preview — same as upload preview but with "Record again" */}
              {recorderState === "recorded" && file && fileUrl ? (
                <div className="rounded-xl border border-surface-700 overflow-hidden bg-surface-900">
                  <div className="relative rounded-t-xl overflow-hidden bg-black">
                    <video
                      src={fileUrl}
                      controls
                      className="w-full max-h-[280px] object-contain"
                      onLoadedMetadata={(e) => {
                        const dur = e.currentTarget.duration;
                        if (isFinite(dur) && dur > 0) setVideoDuration(dur);
                      }}
                    />
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400">
                          <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-200 truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-surface-400 mt-0.5">
                          <span>{formatFileSize(file.size)}</span>
                          {videoDuration !== null && (
                            <>
                              <span className="text-surface-600">&middot;</span>
                              <span>{formatDuration(videoDuration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRecordAgain}
                      className="text-xs text-surface-400 hover:text-surface-200 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 transition-all shrink-0"
                    >
                      {t.recordAgain}
                    </button>
                  </div>
                </div>
              ) : recorderState === "idle" ? (
                /* Idle — Start Recording */
                <div className="relative border-2 border-dashed rounded-xl p-10 text-center border-surface-700">
                  <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <circle cx="12" cy="10" r="3" fill="currentColor" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                  </div>
                  <p className="text-surface-300 font-medium mb-1">
                    {t.recordScreenDesc}
                  </p>
                  {!isSupported ? (
                    <p className="text-xs text-red-400 mt-3">
                      {t.screenRecordingNotSupported}
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={startingCapture}
                      onClick={handleStartCapture}
                      className="mt-4 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:bg-surface-700 disabled:text-surface-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-500/20"
                    >
                      {startingCapture ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="4" fill="currentColor" />
                        </svg>
                      )}
                      {t.startRecording}
                    </button>
                  )}
                </div>
              ) : (
                /* Recording / Paused — Live video */
                <div className="rounded-xl border border-surface-700 overflow-hidden bg-surface-900">
                  <div className="relative rounded-t-xl overflow-hidden bg-black">
                    <video
                      ref={liveVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full max-h-[280px] object-contain"
                    />
                  </div>

                  {/* Controls bar */}
                  <div className="px-4 py-3">
                    {/* Recording / Paused status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            recorderState === "recording"
                              ? "bg-red-500 animate-pulse"
                              : "bg-amber-500"
                          }`}
                        />
                        <span className="text-sm font-medium text-surface-200">
                          {recorderState === "recording" ? t.recordingStatus : t.pausedStatus}
                        </span>
                      </div>
                      <span className="text-sm font-mono text-surface-400">
                        {formatTimer(elapsedSeconds)}
                      </span>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2">
                      {recorderState === "recording" && (
                        <>
                          <button
                            type="button"
                            onClick={handlePauseRecording}
                            className="flex-1 py-2 px-4 rounded-lg border border-surface-600 text-sm font-medium text-surface-300 hover:bg-surface-800 transition-all"
                          >
                            {t.pauseRecording}
                          </button>
                          <button
                            type="button"
                            onClick={handleStopRecording}
                            className="flex-1 py-2 px-4 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-all"
                          >
                            {t.stopRecording}
                          </button>
                        </>
                      )}
                      {recorderState === "paused" && (
                        <>
                          <button
                            type="button"
                            onClick={handleResumeRecording}
                            className="flex-1 py-2 px-4 rounded-lg border border-surface-600 text-sm font-medium text-surface-300 hover:bg-surface-800 transition-all"
                          >
                            {t.resumeRecording}
                          </button>
                          <button
                            type="button"
                            onClick={handleStopRecording}
                            className="flex-1 py-2 px-4 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-all"
                          >
                            {t.stopRecording}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            {t.titleLabel}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            required
            className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
          />
        </div>

        {/* Template */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            {t.templateLabel}
          </label>
          <div className="grid gap-3">
            {templates.map((tp) => (
              <button
                key={tp.id}
                type="button"
                onClick={() => setTemplate(tp.id)}
                className={`flex items-start gap-3.5 w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                  template === tp.id
                    ? "border-brand-500/50 bg-brand-500/8 ring-1 ring-brand-500/20"
                    : "border-surface-700 bg-surface-900/50 hover:border-surface-600 hover:bg-surface-800/50"
                }`}
              >
                <div
                  className={`mt-0.5 shrink-0 ${
                    template === tp.id ? "text-brand-400" : "text-surface-500"
                  }`}
                >
                  {tp.icon}
                </div>
                <div>
                  <span
                    className={`text-sm font-semibold block ${
                      template === tp.id ? "text-brand-300" : "text-surface-300"
                    }`}
                  >
                    {tp.label}
                  </span>
                  <span className="text-xs text-surface-500 mt-0.5 block">
                    {tp.description}
                  </span>
                </div>
                <div className="ml-auto mt-1 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      template === tp.id
                        ? "border-brand-400 bg-brand-400"
                        : "border-surface-600"
                    }`}
                  >
                    {template === tp.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 text-red-400 text-sm bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!file || !title.trim() || uploading}
          className="w-full bg-brand-500 hover:bg-brand-400 disabled:bg-surface-800 disabled:text-surface-500 text-white py-3 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-brand-500/20 active:scale-[0.99] disabled:hover:shadow-none disabled:active:scale-100"
        >
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
              </svg>
              {progress}
            </span>
          ) : (
            t.createAndUpload
          )}
        </button>
      </form>
    </div>
  );
}
