"use client";

import { useState } from "react";
import type { SubtitleStyle } from "@/db/schema";

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Roboto Mono", label: "Roboto Mono" },
  { value: "Impact", label: "Impact" },
  { value: "Courier New", label: "Courier New" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
];

const ANIMATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide Up" },
  { value: "typewriter", label: "Typewriter" },
] as const;

interface SubtitleStylePanelProps {
  style: SubtitleStyle;
  onChange: (style: SubtitleStyle) => void;
  onSave: (style: SubtitleStyle) => void;
  saving: boolean;
  t: Record<string, string>;
}

export default function SubtitleStylePanel({
  style,
  onChange,
  onSave,
  saving,
  t,
}: SubtitleStylePanelProps) {
  const [expanded, setExpanded] = useState(false);

  function update(partial: Partial<SubtitleStyle>) {
    const next = { ...style, ...partial };
    onChange(next);
  }

  return (
    <div className="border-t border-surface-800 pt-3 mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors w-full"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        {t.subtitleStyle || "Subtitle Style"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500 ml-auto">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-4 animate-fade-in">
          {/* Font Family */}
          <div>
            <label className="text-[11px] text-surface-500 uppercase tracking-wider mb-1.5 block">
              {t.fontFamily || "Font"}
            </label>
            <select
              value={style.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500/50"
              style={{ fontFamily: style.fontFamily }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-[11px] text-surface-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>{t.fontSize || "Size"}</span>
              <span className="text-surface-400 font-mono">{style.fontSize}px</span>
            </label>
            <input
              type="range"
              min={12}
              max={64}
              value={style.fontSize}
              onChange={(e) => update({ fontSize: parseInt(e.target.value) })}
              className="w-full accent-brand-500 h-1.5"
            />
          </div>

          {/* Text Color */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[11px] text-surface-500 uppercase tracking-wider mb-1.5 block">
                {t.textColor || "Text Color"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.textColor}
                  onChange={(e) => update({ textColor: e.target.value })}
                  className="w-8 h-8 rounded border border-surface-700 cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-surface-400">{style.textColor}</span>
              </div>
            </div>
          </div>

          {/* Background */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-surface-500 uppercase tracking-wider">
                {t.background || "Background"}
              </label>
              <button
                onClick={() => update({ showBackground: !style.showBackground })}
                className={`w-8 h-[18px] rounded-full transition-colors relative ${
                  style.showBackground ? "bg-brand-500" : "bg-surface-700"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] transition-transform ${
                    style.showBackground ? "translate-x-[16px]" : "translate-x-[2px]"
                  }`}
                />
              </button>
            </div>
            {style.showBackground && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={style.backgroundColor}
                    onChange={(e) => update({ backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded border border-surface-700 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono text-surface-400">{style.backgroundColor}</span>
                </div>
                <div>
                  <label className="text-[11px] text-surface-500 flex items-center justify-between mb-1">
                    <span>{t.opacity || "Opacity"}</span>
                    <span className="font-mono text-surface-400">{Math.round(style.backgroundOpacity * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(style.backgroundOpacity * 100)}
                    onChange={(e) => update({ backgroundOpacity: parseInt(e.target.value) / 100 })}
                    className="w-full accent-brand-500 h-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Animation */}
          <div>
            <label className="text-[11px] text-surface-500 uppercase tracking-wider mb-1.5 block">
              {t.subtitleAnimation || "Animation"}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ANIMATION_OPTIONS.map((anim) => (
                <button
                  key={anim.value}
                  onClick={() => update({ animation: anim.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    style.animation === anim.value
                      ? "bg-brand-500/15 text-brand-400 border border-brand-500/25"
                      : "bg-surface-800 text-surface-400 border border-surface-700 hover:text-surface-200 hover:border-surface-600"
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview text */}
          <div className="bg-surface-800/50 rounded-lg p-4 flex items-center justify-center min-h-[60px]">
            <div
              style={{
                fontFamily: style.fontFamily,
                fontSize: `${Math.min(style.fontSize, 28)}px`,
                color: style.textColor,
                backgroundColor: style.showBackground
                  ? `${style.backgroundColor}${Math.round(style.backgroundOpacity * 255).toString(16).padStart(2, "0")}`
                  : "transparent",
                padding: style.showBackground ? "4px 12px" : "0",
                borderRadius: "6px",
              }}
            >
              {t.previewText || "Preview subtitle text"}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={() => onSave(style)}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 bg-surface-800 hover:bg-surface-700 disabled:opacity-50 text-surface-200 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-surface-700"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
                {t.saving || "Saving…"}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                {t.saveStyle || "Save Style"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
