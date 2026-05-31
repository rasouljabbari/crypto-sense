"use client";

import { useI18n } from "@/i18n/context";

const WALLET = process.env.NEXT_PUBLIC_SUPPORT_WALLET ?? "";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-theme mt-auto">
      <div className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-theme-secondary space-y-1">
        <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        <p>{t("footer.support")} <span className="font-mono text-theme-text">{WALLET}</span></p>
      </div>
    </footer>
  );
}
