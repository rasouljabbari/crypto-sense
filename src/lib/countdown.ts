import type { TimeframeOption } from "@/lib/timeframe";

// ─── Countdown Engine ──────────────────────────────────────────────────────
// Pure functions. Calculates time remaining until next candle close.
// All arithmetic uses UTC epoch milliseconds.

export interface CountdownState {
  /** Remaining seconds until next candle close. null = error. */
  readonly remaining: number | null;
  /** Whether the current candle just closed (trigger event). */
  readonly justClosed: boolean;
}

/**
 * Calculate seconds remaining until the next candle close for a given timeframe.
 * Returns null if calculation fails.
 *
 * Candle close boundaries (UTC):
 *   15m → minute 0,15,30,45 of each hour
 *   1h  → minute 0 of each hour
 *   4h  → hour 0,4,8,12,16,20 (minute 0)
 *   1d  → 00:00:00 UTC (midnight)
 */
export function secondsUntilNextClose(timeframe: TimeframeOption, nowUtcMs: number): number | null {
  try {
    const d = new Date(nowUtcMs);
    const utcMinutes = d.getUTCMinutes();
    const utcHours = d.getUTCHours();
    const utcSeconds = d.getUTCSeconds();

    let msUntilClose = 0;

    switch (timeframe) {
      case "15m": {
        // Next boundary: minute 0,15,30,45
        const bucket = Math.floor(utcMinutes / 15);
        const closeMinute = (bucket + 1) * 15;
        msUntilClose = Date.UTC(
          d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
          utcHours, closeMinute, 0, 0
        ) - nowUtcMs;
        break;
      }
      case "1h": {
        // Next boundary: next hour, minute 0
        msUntilClose = Date.UTC(
          d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
          utcHours + 1, 0, 0, 0
        ) - nowUtcMs;
        break;
      }
      case "4h": {
        // Next boundary: next multiple of 4 hours
        const nextBucket = (Math.floor(utcHours / 4) + 1) * 4;
        msUntilClose = Date.UTC(
          d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
          nextBucket, 0, 0, 0
        ) - nowUtcMs;
        break;
      }
      case "1d": {
        // Next boundary: midnight UTC
        msUntilClose = Date.UTC(
          d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1,
          0, 0, 0, 0
        ) - nowUtcMs;
        break;
      }
      default:
        return null;
    }

    return Math.max(0, Math.ceil(msUntilClose / 1000));
  } catch {
    return null;
  }
}

/**
 * Format seconds into a display string.
 *   ≥1h  → HH:MM:SS
 *   <1h  → MM:SS
 *   null → "--"
 */
export function formatCountdown(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds < 0) return "--";

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}
