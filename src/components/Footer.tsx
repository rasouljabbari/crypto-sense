"use client";

import { useI18n } from "@/i18n/context";
import { useState } from "react";

const WALLET = process.env.NEXT_PUBLIC_SUPPORT_WALLET ?? "";

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
        {copied && (
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-lg text-[10px] font-semibold animate-pulse pointer-events-none">
            {t("footer.copied")}
          </span>
        )}
      </div>
    </footer>
  );
}
