"use client";

import { useI18n } from "@/i18n/context";
import { useState } from "react";

const WALLET = process.env.NEXT_PUBLIC_SUPPORT_WALLET ?? "";
const LINKEDIN = "https://www.linkedin.com/in/rasoul-jabbari/";

export function Footer() {
  const { t } = useI18n();
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
    <footer className="border-t border-theme mt-auto">
      <div className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-theme-secondary space-y-1 relative">
        <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        <p>
          {t("footer.support")}{" "}
          <button onClick={copy} className="font-mono text-theme-text hover:text-emerald-400 transition-colors cursor-pointer">
            {WALLET}
          </button>
        </p>
        <p>
          <a
            href={LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-theme-text hover:text-blue-400 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Rasoul Jabbari
          </a>
        </p>
        {copied && (
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-lg text-[10px] font-semibold animate-pulse pointer-events-none">
            {t("footer.copied")}
          </span>
        )}
      </div>
    </footer>
  );
}
