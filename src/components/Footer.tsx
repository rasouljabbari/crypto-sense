"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";
import { useState } from "react";

const WALLET = process.env.NEXT_PUBLIC_SUPPORT_WALLET ?? "";
const LINKEDIN = "https://www.linkedin.com/in/rasoul-jabbari/";

export function Footer() {
  const { t, dir } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!WALLET) return;
    try {
      await navigator.clipboard.writeText(WALLET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <footer className="border-t border-theme" dir={dir}>
      <div className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Grid: brand + product + support */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 mb-8 ${dir === "rtl" ? "text-right" : ""}`}>
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 group" aria-label="Crypto Sense home">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white">Crypto Sense</span>
            </Link>
            <p className="text-xs text-theme-secondary leading-relaxed max-w-xs">
              {t("footer.description")}
            </p>
            <p className="text-[10px] text-theme-secondary/60 italic">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Product links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
              {t("footer.product")}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#how-it-works" className="text-xs text-theme-secondary hover:text-emerald-400 transition-colors">
                  {t("footer.how")}
                </Link>
              </li>
              <li>
                <Link href="#features" className="text-xs text-theme-secondary hover:text-emerald-400 transition-colors">
                  {t("footer.features")}
                </Link>
              </li>
              <li>
                <Link href="/analysis" className="text-xs text-theme-secondary hover:text-emerald-400 transition-colors">
                  {t("footer.launch")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-theme-text uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {t("footer.support_title")}
            </h4>
            <p className="text-xs text-theme-secondary leading-relaxed">
              {t("footer.support_desc")}
            </p>
            {WALLET && (
              <div className="bg-theme-card border border-theme rounded-xl p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] sm:text-xs text-theme-text break-all select-all leading-relaxed">
                    {WALLET}
                  </span>
                </div>
                <button
                  onClick={copy}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copy(); } }}
                  aria-label={copied ? t("footer.copied") : t("footer.copy")}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                    copied
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-theme-bg text-theme-text border-theme hover:border-emerald-500/50 hover:text-emerald-400"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {t("footer.copied")}
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {t("footer.copy")}
                    </>
                  )}
                </button>
              </div>
            )}
            <div className="pt-2 space-y-2">
              <h4 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
                {t("footer.contact_label")}
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="mailto:rjdeveloper17@gmail.com"
                    className="inline-flex items-center gap-1.5 text-xs text-theme-secondary hover:text-emerald-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {t("footer.email")}
                  </a>
                </li>
                <li>
                  <a
                    href={LINKEDIN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-theme-secondary hover:text-blue-400 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    {t("footer.author")}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Divider + copyright */}
        <div className="border-t border-theme pt-6">
          <p className="text-xs text-theme-secondary text-center sm:text-left">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>

        {/* Copied toast */}
        {copied && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-xs font-semibold animate-pulse pointer-events-none z-50 whitespace-nowrap">
            {t("footer.copied")}
          </div>
        )}
      </div>
    </footer>
  );
}
