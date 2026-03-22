"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDuration, formatFileSize } from "@/lib/format";
import { useI18n } from "@/lib/i18n-context";

interface Project {
  id: string;
  title: string;
  status: string;
  template: string | null;
  createdAt: string;
  video: {
    id: string;
    fileName: string;
    fileSize: number;
    duration: number;
    width: number;
    height: number;
  } | null;
}

const statusStyles: Record<string, string> = {
  draft: "bg-surface-700 text-surface-300",
  uploaded: "bg-brand-500/15 text-brand-300 border border-brand-500/20",
  frames_extracted: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
  analyzing: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  ready: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
};

export default function Home() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function deleteProject(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-100 tracking-tight">
          {t.projects}
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          {t.manageProjects}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-surface-400 py-16 justify-center">
          <svg className="animate-spin h-5 w-5 text-brand-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
          </svg>
          {t.loadingProjects}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-surface-300 mb-1">{t.noProjectsYet}</p>
          <p className="text-sm text-surface-500 mb-6">
            {t.noProjectsDesc}
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-500/25"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 1v12M1 7h12" />
            </svg>
            {t.createProject}
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 stagger-children">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group block rounded-xl border border-surface-800 bg-surface-900/50 hover:bg-surface-800/60 hover:border-surface-700 transition-all p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-base font-semibold text-surface-100 truncate group-hover:text-brand-300 transition-colors">
                      {project.title}
                    </h2>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        statusStyles[project.status] || statusStyles.draft
                      }`}
                    >
                      {project.status}
                    </span>
                    {project.template && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-surface-800 text-[11px] font-medium text-surface-400">
                        {project.template}
                      </span>
                    )}
                  </div>

                  {project.video ? (
                    <div className="flex items-center gap-3 text-xs text-surface-400">
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-500">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        {formatDuration(project.video.duration)}
                      </span>
                      <span className="text-surface-700">|</span>
                      <span>{project.video.width}x{project.video.height}</span>
                      <span className="text-surface-700">|</span>
                      <span>{formatFileSize(project.video.fileSize)}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-surface-500">{t.noVideoUploaded}</p>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteProject(project.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-surface-500 hover:text-red-400 transition-all"
                  title={t.deleteProject}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
