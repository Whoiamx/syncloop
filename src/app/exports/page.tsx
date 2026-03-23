"use client";

import { useI18n } from "@/lib/i18n-context";

export default function ExportsPage() {
  const { t } = useI18n();

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-100 tracking-tight">{t.exports}</h1>
        <p className="text-sm text-surface-400 mt-1">
          {t.exportsDesc}
        </p>
      </div>

      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-surface-300 mb-1">
          {t.noExportsYet}
        </p>
        <p className="text-sm text-surface-500">
          {t.noExportsDesc}
        </p>
      </div>
    </div>
  );
}
