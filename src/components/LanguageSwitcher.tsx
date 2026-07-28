"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Locale, useI18n } from "@/i18n/context";

/* ── Config ───────────────────────────────────────────────────────────── */

const LANGUAGES: { value: Locale; flag: string }[] = [
  { value: "en", flag: "🇺🇸" },
  { value: "fa", flag: "🇮🇷" },
  { value: "tr", flag: "🇹🇷" },
];

/* ── Types ────────────────────────────────────────────────────────────── */

interface LanguageSwitcherProps {
  /** "header" = compact trigger, dropdown below. "sidebar" = full-width trigger, dropdown above. */
  mode?: "header" | "sidebar";
}

/* ── Component ────────────────────────────────────────────────────────── */

export function LanguageSwitcher({ mode = "header" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const isHeader = mode === "header";
  const currentLang = LANGUAGES.find((l) => l.value === locale) ?? LANGUAGES[0];
  const currentIdx = LANGUAGES.findIndex((l) => l.value === locale);

  /* ── Close helpers ──────────────────────────────────────────────────── */

  const close = useCallback(() => {
    setOpen(false);
    setFocusIdx(-1);
    triggerRef.current?.focus();
  }, []);

  /* ── Outside click ──────────────────────────────────────────────────── */

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusIdx(-1);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /* ── ESC ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  /* ── Auto-focus focused item ────────────────────────────────────────── */

  useEffect(() => {
    if (!open || focusIdx < 0) return;
    itemsRef.current[focusIdx]?.focus();
  }, [open, focusIdx]);

  /* ── Select a language ──────────────────────────────────────────────── */

  const select = useCallback(
    (l: Locale) => {
      setLocale(l);
      setOpen(false);
      setFocusIdx(-1);
    },
    [setLocale],
  );

  /* ── Trigger keyboard ───────────────────────────────────────────────── */

  const onTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (!open) {
            setOpen(true);
            setFocusIdx(currentIdx);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!open) {
            setOpen(true);
            setFocusIdx(currentIdx);
          } else {
            setFocusIdx((i) => (i + 1) % LANGUAGES.length);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (!open) {
            setOpen(true);
            setFocusIdx(currentIdx);
          } else {
            setFocusIdx((i) => (i - 1 + LANGUAGES.length) % LANGUAGES.length);
          }
          break;
        case "Tab":
          close();
          break;
      }
    },
    [open, currentIdx, close],
  );

  /* ── Item keyboard (inside list) ────────────────────────────────────── */

  const onItemKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          select(LANGUAGES[idx].value);
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusIdx((i) => (i + 1) % LANGUAGES.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusIdx((i) => (i - 1 + LANGUAGES.length) % LANGUAGES.length);
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
        case "Tab":
          close();
          break;
      }
    },
    [select, close],
  );

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setFocusIdx(currentIdx);
        }}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t(`locale.${locale}`)}
        className={
          isHeader
            ? "flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-theme-card border border-theme text-xs text-theme-text hover:bg-theme-hover transition-colors"
            : "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs text-theme-secondary hover:text-theme-text hover:bg-theme-hover transition-all duration-200"
        }
      >
        <span className="w-5 h-5 shrink-0 flex items-center justify-center">
          <span className="text-sm leading-none">{currentLang.flag}</span>
        </span>
        {!isHeader && (
          <span className="truncate">{t(`locale.${locale}`)}</span>
        )}
        <svg
          className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isHeader ? "text-theme-secondary" : "ml-auto text-theme-secondary"} ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: isHeader ? -4 : 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: isHeader ? -4 : 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            role="listbox"
            aria-label={t("locale.en")}
            aria-orientation="vertical"
            className={`
              absolute w-40 bg-theme-secondary border border-theme rounded-xl shadow-2xl overflow-hidden z-50
              ${isHeader ? "right-0 mt-1.5" : "bottom-full left-0 right-0 mb-1"}
            `}
          >
            {LANGUAGES.map((lang, idx) => {
              const active = locale === lang.value;
              return (
                <button
                  key={lang.value}
                  ref={(el) => { itemsRef.current[idx] = el; }}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => select(lang.value)}
                  onKeyDown={(e) => onItemKeyDown(e, idx)}
                  className={`
                    group flex items-center gap-2.5 w-full px-3 py-2.5 text-xs transition-all duration-150 outline-none
                    ${
                      active
                        ? "text-emerald-400 bg-emerald-500/10 border-l-2 border-l-emerald-400"
                        : "text-theme-text hover:bg-theme-hover border-l-2 border-l-transparent focus:bg-theme-hover focus:outline-none"
                    }
                  `}
                >
                  <span className="text-sm leading-none">{lang.flag}</span>
                  <span className="flex-1 text-left">{t(`locale.${lang.value}`)}</span>
                  {active && (
                    <svg
                      className="w-3.5 h-3.5 shrink-0 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
