"use client";

import { useI18n } from "@/lib/i18n-context";

export default function UsagePage() {
  const { t } = useI18n();

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-100 tracking-tight">{t.usage}</h1>
        <p className="text-sm text-surface-400 mt-1">
          {t.usageDesc}
        </p>
      </div>

      {/* Usage bars placeholder */}
      <div className="space-y-6">
        {[
          { label: t.aiCredits, used: 0, total: 100, color: "brand" },
          { label: t.videoMinutes, used: 0, total: 60, color: "sky" },
          { label: t.exportsUsage, used: 0, total: 10, color: "emerald" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-surface-800 bg-surface-900/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-surface-200">{item.label}</span>
              <span className="text-xs text-surface-500 tabular-nums">
                {item.used} / {item.total}
              </span>
            </div>
            <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.color === "brand" ? "bg-brand-500"
                  : item.color === "sky" ? "bg-sky-500"
                  : "bg-emerald-500"
                }`}
                style={{ width: `${(item.used / item.total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
