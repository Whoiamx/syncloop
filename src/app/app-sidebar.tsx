"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useTheme } from "@/lib/theme-context";
import type { Locale } from "@/lib/i18n";

const localeOptions: { value: Locale; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "\u{1F1FA}\u{1F1F8}" },
  { value: "es", label: "Espa\u{00F1}ol", flag: "\u{1F1EA}\u{1F1F8}" },
  { value: "pt", label: "Portugu\u{00EA}s", flag: "\u{1F1E7}\u{1F1F7}" },
];

function SidebarLanguageDropdown({
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
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800/60 transition-all"
        aria-label="Select language"
        aria-expanded={open}
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
          className={`ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-1.5 w-full rounded-xl border border-surface-700 bg-surface-800 shadow-xl shadow-black/30 overflow-hidden z-50">
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
                  : "text-surface-300 hover:bg-surface-700/60 hover:text-surface-100"
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

interface NavItem {
  labelKey: "projects" | "newProject" | "settings";
  href: string;
  icon: React.ReactNode;
  matchPaths: string[];
}

const navItems: NavItem[] = [
  {
    labelKey: "projects",
    href: "/dashboard",
    matchPaths: ["/dashboard"],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <polygon points="10,7 10,13 15,10" />
        <path d="M2 20h20" />
      </svg>
    ),
  },
  {
    labelKey: "newProject",
    href: "/projects/new",
    matchPaths: ["/projects/new"],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    labelKey: "settings",
    href: "#",
    matchPaths: [],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export function AppSidebar() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function isActive(item: NavItem) {
    if (item.matchPaths.some((p) => pathname === p)) return true;
    // Projects detail pages also highlight "Projects"
    if (item.labelKey === "projects" && pathname.startsWith("/projects/") && pathname !== "/projects/new") return true;
    return false;
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 h-[72px] flex items-center gap-2.5 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
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
      </div>

      {/* Separator */}
      <div className="mx-4 border-t border-surface-700/60" />

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.labelKey}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
              }`}
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-500 shadow-[0_0_8px_rgba(212,113,78,0.4)]" />
              )}
              <span className={`transition-colors ${active ? "text-brand-400" : "text-surface-500 group-hover:text-surface-300"}`}>
                {item.icon}
              </span>
              <span>{t[item.labelKey]}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-2 shrink-0">
        {/* Separator */}
        <div className="mx-1 mb-2 border-t border-surface-700/60" />

        {/* Language selector */}
        <SidebarLanguageDropdown locale={locale} setLocale={setLocale} />

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800/60 transition-all"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
          <span className="text-xs font-semibold">
            {theme === "dark" ? "Light" : "Dark"}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 rounded-lg bg-surface-900 border border-surface-700/60 text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-all shadow-lg"
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide in/out */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[220px] bg-surface-900 border-r border-surface-700/40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
