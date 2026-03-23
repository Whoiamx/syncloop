"use client";

import { useI18n } from "@/lib/i18n-context";

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div className="animate-fade-in">
      {/* Welcome */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-surface-100 tracking-tight mb-1">
          {t.welcomeBack} 👋
        </h1>
        <p className="text-sm text-surface-400">
          {t.homeDesc}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          {
            label: t.projects,
            value: "—",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <polygon points="10,7 10,13 15,10" />
                <path d="M2 20h20" />
              </svg>
            ),
            color: "brand",
          },
          {
            label: t.exports,
            value: "—",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            ),
            color: "emerald",
          },
          {
            label: t.subtitlesGenerated,
            value: "—",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            ),
            color: "sky",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-surface-800 bg-surface-900/50 p-5 flex items-start gap-4"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              stat.color === "brand" ? "bg-brand-500/10 text-brand-400"
              : stat.color === "emerald" ? "bg-emerald-500/10 text-emerald-400"
              : "bg-sky-500/10 text-sky-400"
            }`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-100 tabular-nums">{stat.value}</p>
              <p className="text-xs text-surface-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
          {t.quickActions}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="/projects/new"
            className="group flex items-center gap-4 rounded-xl border border-surface-800 bg-surface-900/50 hover:bg-surface-800/60 hover:border-surface-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 transition-all p-5"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0 group-hover:bg-brand-500/15 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-100 group-hover:text-brand-300 transition-colors">
                {t.uploadVideo}
              </p>
              <p className="text-xs text-surface-500 mt-0.5">
                {t.uploadVideoDesc}
              </p>
            </div>
          </a>
          <a
            href="/projects/new?mode=record"
            className="group flex items-center gap-4 rounded-xl border border-surface-800 bg-surface-900/50 hover:bg-surface-800/60 hover:border-surface-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 transition-all p-5"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 group-hover:bg-sky-500/15 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <circle cx="12" cy="10" r="3" />
                <path d="M2 20h20" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-100 group-hover:text-sky-300 transition-colors">
                {t.recordScreen}
              </p>
              <p className="text-xs text-surface-500 mt-0.5">
                {t.recordScreenDesc2}
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
