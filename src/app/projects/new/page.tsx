"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";

export default function NewProject() {
  const { t } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<"tutorial" | "product_demo">(
    "tutorial"
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const handleFile = useCallback(
    (f: File) => {
      const allowedTypes = [
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
      ];
      if (!allowedTypes.includes(f.type)) {
        setError(t.invalidFileType);
        return;
      }
      setFile(f);
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

      setProgress(t.done);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.somethingWrong);
      setUploading(false);
    }
  }

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
        {/* Video Upload */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            {t.videoLabel}
          </label>
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
                : file
                  ? "border-brand-500/40 bg-brand-500/5"
                  : "border-surface-700 hover:border-surface-500 hover:bg-surface-900/50"
            }`}
          >
            {file ? (
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-brand-300 font-semibold">{file.name}</p>
                <p className="text-sm text-surface-400 mt-1">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                  <span className="text-surface-600 mx-2">·</span>
                  {t.clickToChange}
                </p>
              </div>
            ) : (
              <div>
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
              accept="video/*"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
              className="hidden"
            />
          </div>
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
