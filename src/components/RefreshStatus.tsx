"use client";

import { useSnapshotStore } from "@/store/useAnalysisSnapshot";
import { useI18n } from "@/i18n/context";
import { useCountdown } from "@/lib/countdown-context";

function timeAgo(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function RefreshStatus() {
  const isLoading = useSnapshotStore((s) => s.isLoading);
  const lastUpdated = useSnapshotStore((s) => s.lastUpdated);
  const triggerRefresh = useSnapshotStore((s) => s.triggerRefresh);
  const { t } = useI18n();
  const { now } = useCountdown();

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-3 px-1 mb-3 text-[11px] flex-wrap">
      {lastUpdated && (
        <span className="text-gray-500">
          {t("refresh_status.updated")} <span className="text-gray-400 font-mono">{timeAgo(lastUpdated, now)} {t("refresh_status.ago")}</span>
        </span>
      )}

      <button
        onClick={triggerRefresh}
        className="ml-auto flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors"
        title={t("header.refresh")}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
        {t("header.refresh")}
      </button>
    </div>
  );
}
