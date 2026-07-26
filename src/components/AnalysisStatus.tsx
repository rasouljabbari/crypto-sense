"use client";

import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/i18n/context";
import { useTimeframe } from "@/lib/timeframe";
import { useSnapshotStore } from "@/store/useAnalysisSnapshot";
import { getCandleCloseInfo } from "@/lib/candleTime";

const SNAPSHOT_DELAY_MS = 8_000; // CANDLE_SETTLE_MS (5s) + POST_CLOSE_DELAY_MS (3s)

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Gregorian → Jalali (for Farsi locale). */
function toJalali(gy: number, gm: number, gd: number): { year: number; month: number; day: number } {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
  const jy = -1595 + 33 * Math.floor(days / 12053);
  let rem = days % 12053;
  let jy2 = jy + 4 * Math.floor(rem / 1461);
  rem %= 1461;
  if (rem > 365) {
    jy2 += Math.floor((rem - 1) / 365);
    rem = (rem - 1) % 365;
  }
  const jm = rem < 186 ? 1 + Math.floor(rem / 31) : 7 + Math.floor((rem - 186) / 30);
  const jd = 1 + (rem < 186 ? rem % 31 : (rem - 186) % 30);
  return { year: jy2, month: jm, day: jd };
}

function formatDate(ts: number, locale: string): string {
  const d = new Date(ts);
  if (locale === "fa") {
    const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${j.year}/${pad(j.month)}/${pad(j.day)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Global snapshot status — same values everywhere. */
export function AnalysisStatus() {
  const { t, locale } = useI18n();
  const { timeframe } = useTimeframe();
  const version = useSnapshotStore((s) => s.version);
  const lastUpdated = useSnapshotStore((s) => s.lastUpdated);

  const [now, setNow] = useState<number | null>(null);

  // Tick every second for countdown — client only
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { lastClosedAt, nextCloseAt } = useMemo(
    () => getCandleCloseInfo(timeframe),
    [timeframe],
  );

  // Countdown targets actual snapshot arrival: candle close + settle + post-close delay
  const nextSnapshotAt = nextCloseAt + SNAPSHOT_DELAY_MS;
  const countdownStr = now === null
    ? "--:--"
    : (() => {
        const sec = Math.max(0, Math.floor((nextSnapshotAt - now) / 1000));
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return h > 0
          ? `${pad(h)}:${pad(m)}:${pad(s)}`
          : `${pad(m)}:${pad(s)}`;
      })();

  const versionStr = lastUpdated
    ? formatDate(new Date(lastUpdated).getTime(), locale)
    : "—";

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 py-2 text-[11px] text-gray-400">
      {/* Timeframe */}
      <span className="flex items-center gap-1.5">
        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span className="text-gray-500">{t("timeframe.label")}</span>
        <span className="font-semibold text-gray-300 font-mono">{timeframe.toUpperCase()}</span>
      </span>

      {/* Last Closed Candle */}
      <span className="flex items-center gap-1.5">
        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-gray-500">{t("analysis_status.last_closed_candle")}</span>
        <span className="font-mono text-gray-200">{formatTime(lastClosedAt)}</span>
      </span>

      {/* Snapshot Version */}
      <span className="flex items-center gap-1.5">
        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span className="text-gray-500">{t("analysis_status.snapshot_version")}</span>
        <span className="font-mono text-gray-200">{versionStr}</span>
        <span className="font-mono text-gray-500">#{version}</span>
      </span>

      {/* Next Snapshot */}
      <span className="flex items-center gap-1.5">
        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-gray-500">{t("analysis_status.next_snapshot")}</span>
        <span className="font-mono text-emerald-400 font-medium">{countdownStr}</span>
      </span>
    </div>
  );
}
