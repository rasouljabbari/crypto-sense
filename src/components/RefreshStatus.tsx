"use client";

import { useStore } from "@/store/useStore";
import { useI18n } from "@/i18n/context";
import { useState, useEffect } from "react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const min = Math.ceil(diff / 60000);
  const sec = Math.ceil((diff % 60000) / 1000);
  return `${min}m ${sec}s`;
}

export function RefreshStatus() {
  const { isLoading, isRefreshing, lastUpdated, nextRefreshAt, refreshError, reanalyzeSilent, startAutoRefresh } = useStore();
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cleanup = startAutoRefresh();
    return cleanup;
  }, [startAutoRefresh]);

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-3 px-1 mb-3 text-[11px] flex-wrap">
      {isRefreshing && (
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {t("header.refreshing")}
        </span>
      )}

      {lastUpdated && (
        <span className="text-gray-500">
          {t("refresh_status.updated")} <span className="text-gray-400 font-mono">{timeAgo(lastUpdated)} {t("refresh_status.ago")}</span>
        </span>
      )}

      {nextRefreshAt && !isRefreshing && (
        <span className="text-gray-500">
          {t("refresh_status.next")} <span className="text-gray-400 font-mono">{timeUntil(nextRefreshAt)}</span>
        </span>
      )}

      {refreshError && (
        <span className="flex items-center gap-1.5 text-red-400">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {refreshError}
          <button
            onClick={() => reanalyzeSilent()}
            className="underline hover:text-red-300 transition-colors"
          >
            {t("header.refresh")}
          </button>
        </span>
      )}

      <button
        onClick={() => {
          reanalyzeSilent();
          if (nextRefreshAt) {
            const ms = 5 * 60 * 1000;
            useStore.setState({ nextRefreshAt: new Date(Date.now() + ms).toISOString() });
          }
        }}
        className={`ml-auto flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors ${isRefreshing ? "opacity-50 pointer-events-none" : ""}`}
        title={t("header.refresh")}
      >
        <svg
          className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
        {t("header.refresh")}
      </button>
    </div>
  );
}
