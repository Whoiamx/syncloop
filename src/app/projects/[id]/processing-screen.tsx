"use client";

import { useEffect, useState } from "react";

export type ProcessingStep = "uploading" | "extracting" | "analyzing" | "generating";
export type StepStatus = "completed" | "in_progress" | "pending" | "error";

export interface ProcessingStepInfo {
  id: ProcessingStep;
  status: StepStatus;
  error?: string;
}

interface ProcessingScreenProps {
  steps: ProcessingStepInfo[];
  currentStep: ProcessingStep;
  projectTitle: string;
  t: Record<string, string>;
}

const STEP_META: Record<ProcessingStep, { icon: React.ReactNode; tKey: string; descKey: string; number: string }> = {
  uploading: {
    tKey: "processingUpload",
    descKey: "processingUploadDesc",
    number: "01",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  extracting: {
    tKey: "processingExtract",
    descKey: "processingExtractDesc",
    number: "02",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18" />
      </svg>
    ),
  },
  analyzing: {
    tKey: "processingAnalyze",
    descKey: "processingAnalyzeDesc",
    number: "03",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  generating: {
    tKey: "processingGenerate",
    descKey: "processingGenerateDesc",
    number: "04",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.376 3.622a1 1 0 013.002 3.002L7.368 18.635a2 2 0 01-.855.506l-2.872.838.838-2.872a2 2 0 01.506-.855L16.376 3.622z" />
      </svg>
    ),
  },
};

function StepNode({
  step,
  status,
  error,
  isLast,
  t,
}: {
  step: ProcessingStep;
  status: StepStatus;
  error?: string;
  isLast: boolean;
  t: Record<string, string>;
}) {
  const meta = STEP_META[step];

  return (
    <div className="flex gap-4">
      {/* Vertical timeline node + connector */}
      <div className="flex flex-col items-center">
        {/* Circle node */}
        <div
          className={`relative w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
            status === "completed"
              ? "bg-brand-500 text-white"
              : status === "in_progress"
              ? "bg-brand-500/20 text-brand-400 ring-2 ring-brand-400/50"
              : status === "error"
              ? "bg-red-500/20 text-red-400 ring-2 ring-red-400/50"
              : "bg-surface-800 text-surface-500"
          }`}
        >
          {status === "completed" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : status === "in_progress" ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
          ) : status === "error" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <span className="text-xs font-bold tabular-nums">{meta.number}</span>
          )}
          {/* Pulse ring for in_progress */}
          {status === "in_progress" && (
            <span className="absolute inset-0 rounded-full animate-ping bg-brand-400/20" style={{ animationDuration: "2s" }} />
          )}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div className={`w-px flex-1 min-h-[24px] transition-colors duration-500 ${
            status === "completed" ? "bg-brand-500/40" : "bg-surface-700/50"
          }`} />
        )}
      </div>

      {/* Content */}
      <div className={`pb-7 ${isLast ? "pb-0" : ""}`}>
        <p className={`text-base font-semibold leading-tight ${
          status === "completed" || status === "in_progress"
            ? "text-surface-100"
            : status === "error"
            ? "text-red-300"
            : "text-surface-500"
        }`}>
          {t[meta.tKey] || meta.tKey}
        </p>
        <p className={`text-sm mt-1 leading-relaxed ${
          status === "error" ? "text-red-400/80" : "text-surface-500"
        }`}>
          {error || (t[meta.descKey] || meta.descKey)}
        </p>
      </div>
    </div>
  );
}

export default function ProcessingScreen({ steps, currentStep, projectTitle, t }: ProcessingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const completedCount = steps.filter((s) => s.status === "completed").length;
    const inProgressCount = steps.filter((s) => s.status === "in_progress").length;
    const target = ((completedCount + inProgressCount * 0.4) / steps.length) * 100;

    const timer = setTimeout(() => setProgress(target), 150);
    return () => clearTimeout(timer);
  }, [steps]);

  const currentMeta = STEP_META[currentStep];
  const hasError = steps.some((s) => s.status === "error");

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] animate-fade-in">
      {/* Header area */}
      <div className="text-center mb-10">
        {/* Pulsing icon */}
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ${
          hasError
            ? "bg-red-500/10 text-red-400"
            : "bg-brand-500/10 text-brand-400 animate-pulse-glow"
        }`}>
          {hasError ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          ) : (
            currentMeta.icon
          )}
        </div>

        <h2 className="text-xl font-bold text-surface-100 tracking-tight mb-1.5">
          {hasError
            ? (t.processingFailed || "Processing failed")
            : (t[currentMeta.tKey] || currentMeta.tKey)}
        </h2>
        <p className="text-base text-surface-400 max-w-sm mx-auto">
          {hasError
            ? ""
            : (t.processingVideoSubtitle || "Syncloop is analyzing your video content...")}
        </p>
      </div>

      {/* Progress bar */}
      {!hasError && (
        <div className="w-full max-w-sm mb-10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-brand-400 tabular-nums">
              {Math.round(progress)}%
            </span>
            <span className="text-xs text-surface-500">
              {t[currentMeta.descKey] || ""}
            </span>
          </div>
          <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, var(--color-brand-600), var(--color-brand-400))",
              }}
            />
          </div>
        </div>
      )}

      {/* Vertical step timeline */}
      <div className="w-full max-w-sm" aria-live="polite" role="status">
        {steps.map((step, i) => (
          <StepNode
            key={step.id}
            step={step.id}
            status={step.status}
            error={step.error}
            isLast={i === steps.length - 1}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
