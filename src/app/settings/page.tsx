"use client";

import { useI18n } from "@/lib/i18n-context";

export default function SettingsPage() {
  const { t } = useI18n();

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-100 tracking-tight">{t.settings}</h1>
        <p className="text-sm text-surface-400 mt-1">
          {t.settingsDesc}
        </p>
      </div>

      <div className="space-y-4">
        {/* Profile section */}
        <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-6">
          <h2 className="text-base font-semibold text-surface-200 mb-4">{t.profile}</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
              G
            </div>
            <div>
              <p className="text-sm font-medium text-surface-100">Gaston</p>
              <p className="text-xs text-surface-500">Free plan</p>
            </div>
          </div>
        </div>

        {/* Preferences section */}
        <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-6">
          <h2 className="text-base font-semibold text-surface-200 mb-4">{t.preferences}</h2>
          <p className="text-sm text-surface-500">
            {t.preferencesDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
