"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { useI18n } from "@/lib/i18n-context";

/* ─── Scroll-reveal wrapper ─── */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Icons ─── */
function IconUpload() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconScan() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h7v7" />
      <path d="M14 21h7" />
      <path d="M21 14v7" />
    </svg>
  );
}

function IconExport() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242" />
      <path d="M12 12v9" />
      <path d="M8 17l4 4 4-4" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconTemplate() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ─── FAQ Item ─── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-surface-800 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span className="text-base font-medium text-surface-100 group-hover:text-brand-400 transition-colors">
          {question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0 text-surface-500"
        >
          <IconChevronDown />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <p className="text-sm text-surface-400 leading-relaxed pb-5">{answer}</p>
      </motion.div>
    </div>
  );
}

/* ─── Section Label ─── */
function SectionLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-400">
      <span className="w-8 h-px bg-brand-400/50" />
      {text}
      <span className="w-8 h-px bg-brand-400/50" />
    </span>
  );
}

/* ─── Landing Page ─── */
export default function LandingPage() {
  const { t } = useI18n();

  const steps = [
    { icon: <IconUpload />, title: t.step1Title, desc: t.step1Desc, num: "01" },
    { icon: <IconScan />, title: t.step2Title, desc: t.step2Desc, num: "02" },
    { icon: <IconExport />, title: t.step3Title, desc: t.step3Desc, num: "03" },
  ];

  const features = [
    { icon: <IconEye />, title: t.feature1Title, desc: t.feature1Desc },
    { icon: <IconTemplate />, title: t.feature2Title, desc: t.feature2Desc },
    { icon: <IconGlobe />, title: t.feature3Title, desc: t.feature3Desc },
    { icon: <IconClock />, title: t.feature4Title, desc: t.feature4Desc },
    { icon: <IconEdit />, title: t.feature5Title, desc: t.feature5Desc },
    { icon: <IconDownload />, title: t.feature6Title, desc: t.feature6Desc },
  ];

  const audiences = [
    { emoji: "🎬", title: t.who1Title, desc: t.who1Desc },
    { emoji: "🚀", title: t.who2Title, desc: t.who2Desc },
    { emoji: "📚", title: t.who3Title, desc: t.who3Desc },
    { emoji: "📢", title: t.who4Title, desc: t.who4Desc },
  ];

  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
    { q: t.faq5Q, a: t.faq5A },
  ];

  return (
    <div className="-mx-6 -mt-8">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Background gradients */}
        <div className="absolute inset-0 -z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-brand-500/8 blur-[120px]"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 0.3 }}
            className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-brand-400/5 blur-[100px]"
          />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/20 bg-brand-500/5 text-brand-400 text-xs font-medium mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            {t.heroTag}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-surface-100 tracking-tight leading-[1.1] mb-6"
          >
            {t.heroTitle}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl text-surface-400 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            {t.heroSubtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-7 py-3.5 rounded-xl text-base font-semibold transition-all hover:shadow-xl hover:shadow-brand-500/25"
              >
                {t.heroCta}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-surface-300 hover:text-surface-100 px-7 py-3.5 rounded-xl text-base font-medium transition-colors border border-surface-800 hover:border-surface-700 hover:bg-surface-900/50"
              >
                {t.heroSecondaryCta}
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* Hero visual — app preview */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto mt-16"
        >
          <div className="relative rounded-2xl border border-surface-800 bg-surface-900/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-800">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-surface-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-surface-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-surface-700" />
              </div>
              <div className="flex-1 text-center">
                <div className="inline-block px-12 py-1 rounded-md bg-surface-800/80 text-xs text-surface-500">
                  syncloop.app
                </div>
              </div>
              <div className="w-12" />
            </div>
            {/* App content mock */}
            <div className="p-6 sm:p-8">
              <div className="flex gap-6">
                <div className="flex-1 aspect-video rounded-xl bg-surface-800 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent" />
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center backdrop-blur-sm border border-brand-500/20"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-brand-400 ml-1">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </motion.div>
                  {/* Subtitle bar */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                      <span className="text-xs sm:text-sm text-white font-medium">
                        Click the export button to save your project
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Subtitle timeline mock */}
              <div className="mt-4 flex gap-1.5">
                {[
                  { flex: "flex-[2]", text: "Welcome to the tutorial...", delay: 0.8 },
                  { flex: "flex-[3]", text: "Click on File and select New", delay: 1.0 },
                  { flex: "flex-[2]", text: "Enter your details...", delay: 1.2 },
                ].map((seg) => (
                  <motion.div
                    key={seg.text}
                    initial={{ opacity: 0, scaleX: 0.7 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.5, delay: seg.delay, ease: [0.22, 1, 0.36, 1] }}
                    className={`h-8 rounded-md bg-brand-500/15 border border-brand-500/20 ${seg.flex} flex items-center px-3 origin-left`}
                  >
                    <span className="text-[10px] text-brand-300 truncate">{seg.text}</span>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                  className="h-8 rounded-md bg-surface-800 flex-[1.5]"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="px-6 py-24 sm:py-32">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <SectionLabel text={t.howItWorksLabel} />
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-100 tracking-tight mt-4 mb-4">
              {t.howItWorksTitle}
            </h2>
            <p className="text-surface-400 text-lg max-w-xl mx-auto">
              {t.howItWorksSubtitle}
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <Reveal key={step.num} delay={i * 0.12}>
                <motion.div
                  whileHover={{ y: -4, borderColor: "rgba(224, 122, 95, 0.25)" }}
                  transition={{ duration: 0.25 }}
                  className="relative group rounded-2xl border border-surface-800 bg-surface-900/40 p-7 h-full"
                >
                  <div className="absolute top-6 right-6 text-5xl font-black text-surface-800/80 select-none">
                    {step.num}
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -3 }}
                    className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/15 flex items-center justify-center text-brand-400 mb-5"
                  >
                    {step.icon}
                  </motion.div>
                  <h3 className="text-lg font-bold text-surface-100 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-surface-400 leading-relaxed">
                    {step.desc}
                  </p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="px-6 py-24 sm:py-32 border-t border-surface-800/60">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <SectionLabel text={t.featuresLabel} />
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-100 tracking-tight mt-4 mb-4">
              {t.featuresTitle}
            </h2>
            <p className="text-surface-400 text-lg max-w-xl mx-auto">
              {t.featuresSubtitle}
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl border border-surface-800 bg-surface-900/30 p-6 hover:border-surface-700 hover:bg-surface-900/60 transition-colors group h-full"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/15 flex items-center justify-center text-brand-400 mb-4 group-hover:bg-brand-500/15 transition-colors"
                  >
                    {f.icon}
                  </motion.div>
                  <h3 className="text-base font-semibold text-surface-100 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-surface-400 leading-relaxed">
                    {f.desc}
                  </p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ WHO IS IT FOR ═══════════════ */}
      <section className="px-6 py-24 sm:py-32 border-t border-surface-800/60">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <SectionLabel text={t.whoLabel} />
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-100 tracking-tight mt-4 mb-4">
              {t.whoTitle}
            </h2>
            <p className="text-surface-400 text-lg max-w-xl mx-auto">
              {t.whoSubtitle}
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {audiences.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl border border-surface-800 bg-surface-900/30 p-6 text-center hover:border-surface-700 hover:bg-surface-900/60 transition-colors h-full"
                >
                  <motion.div
                    whileHover={{ scale: 1.3, rotate: 10 }}
                    className="text-3xl mb-4 inline-block"
                  >
                    {a.emoji}
                  </motion.div>
                  <h3 className="text-base font-semibold text-surface-100 mb-2">
                    {a.title}
                  </h3>
                  <p className="text-sm text-surface-400 leading-relaxed">
                    {a.desc}
                  </p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section id="faq" className="px-6 py-24 sm:py-32 border-t border-surface-800/60">
        <div className="max-w-2xl mx-auto">
          <Reveal className="text-center mb-12">
            <SectionLabel text={t.faqLabel} />
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-100 tracking-tight mt-4 mb-4">
              {t.faqTitle}
            </h2>
            <p className="text-surface-400 text-lg">
              {t.faqSubtitle}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-surface-800 bg-surface-900/30 px-6 sm:px-8">
              {faqs.map((faq) => (
                <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="px-6 py-24 sm:py-32">
        <Reveal>
          <div className="max-w-3xl mx-auto relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-brand-500/10 via-brand-400/5 to-transparent blur-2xl" />
            <div className="rounded-2xl border border-brand-500/15 bg-surface-900/60 backdrop-blur-sm p-10 sm:p-14 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-surface-100 tracking-tight mb-4">
                {t.ctaTitle}
              </h2>
              <p className="text-surface-400 text-lg mb-8 max-w-lg mx-auto">
                {t.ctaSubtitle}
              </p>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Link
                  href="/projects/new"
                  className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all hover:shadow-xl hover:shadow-brand-500/25"
                >
                  {t.ctaCta}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </Link>
              </motion.div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-surface-800/60 px-6 py-14">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10 mb-12">
            <div className="sm:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                    <rect x="4" y="4" width="24" height="18" rx="3" stroke="white" strokeWidth="2.5" fill="none" />
                    <polygon points="13,8 13,18 21,13" fill="white" />
                    <rect x="6" y="25" width="5" height="2.2" rx="1" fill="#6ee7b7" />
                    <rect x="13" y="25" width="8" height="2.2" rx="1" fill="#6ee7b7" />
                    <rect x="23" y="25" width="4" height="2.2" rx="1" fill="#6ee7b7" />
                  </svg>
                </div>
                <span className="text-base font-bold text-surface-100">Syncloop</span>
              </div>
              <p className="text-sm text-surface-500 leading-relaxed">
                {t.footerTagline}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-4">{t.footerProduct}</h4>
              <ul className="space-y-2.5">
                <li><Link href="/dashboard" className="text-sm text-surface-500 hover:text-surface-300 transition-colors">{t.footerDashboard}</Link></li>
                <li><span className="text-sm text-surface-600 cursor-default">{t.footerPricing}</span></li>
                <li><span className="text-sm text-surface-600 cursor-default">{t.footerChangelog}</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-4">{t.footerResources}</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-surface-600 cursor-default">{t.footerDocs}</span></li>
                <li><span className="text-sm text-surface-600 cursor-default">{t.footerSupport}</span></li>
                <li><span className="text-sm text-surface-600 cursor-default">{t.footerBlog}</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-surface-300 mb-4">{t.footerLegal}</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-surface-600 cursor-default">{t.footerPrivacy}</span></li>
                <li><span className="text-sm text-surface-600 cursor-default">{t.footerTerms}</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-surface-800/60 pt-6 flex items-center justify-between">
            <p className="text-xs text-surface-600">
              &copy; {new Date().getFullYear()} Syncloop. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
