"use client";

import { useI18n } from "@/i18n/context";

export function DashboardFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-theme mt-auto">
      <div className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-theme-secondary">
        <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
