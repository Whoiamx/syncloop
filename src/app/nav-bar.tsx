"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useTheme } from "@/lib/theme-context";
import type { Locale } from "@/lib/i18n";

const localeOptions: { value: Locale; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "pt", label: "Português", flag: "🇧🇷" },
];

function LanguageDropdown({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = localeOptions.find((o) => o.value === locale)!;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 transition-all"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="text-xs font-semibold">{current.value.toUpperCase()}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 rounded-xl border border-surface-800 bg-surface-900 shadow-xl shadow-black/20 overflow-hidden z-50">
          {localeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setLocale(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors ${
                locale === opt.value
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-surface-300 hover:bg-surface-800/60 hover:text-surface-100"
              }`}
            >
              <span className="text-base leading-none">{opt.flag}</span>
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <nav className="sticky top-0 z-50 border-b border-surface-800/60 bg-surface-950/80 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="24" height="18" rx="3" stroke="white" strokeWidth="2.2" fill="none"/>
              <polygon points="13,8 13,18 21,13" fill="white"/>
              <rect x="6" y="25" width="5" height="2.2" rx="1" fill="#6ee7b7"/>
              <rect x="13" y="25" width="8" height="2.2" rx="1" fill="#6ee7b7"/>
              <rect x="23" y="25" width="4" height="2.2" rx="1" fill="#6ee7b7"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-surface-100 tracking-tight">
            Syncloop
          </span>
        </Link>

        {/* Center links (landing only) */}
        {isLanding && (
          <div className="hidden md:flex items-center gap-2">
            {[
              { label: t.navHowItWorks, href: "#how-it-works" },
              { label: t.navFeatures, href: "#features" },
              { label: t.navFaq, href: "#faq" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-surface-400 hover:text-surface-100 hover:bg-surface-800/50 transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {/* Language dropdown */}
          <LanguageDropdown locale={locale} setLocale={setLocale} />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 transition-all"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {isLanding ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.97]"
            >
              {t.dashboard}
            </Link>
          ) : (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.97]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M7 1v12M1 7h12" />
              </svg>
              {t.newProject}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
