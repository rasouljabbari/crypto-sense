"use client";

import { useI18n } from "@/i18n/context";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CoinAnalysis } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────

type OppKey = "ready_long" | "ready_short" | "watch" | "wait" | "weakening" | "invalid";

interface QueuedNotif {
  coinId: string;
  symbol: string;
  oppKey: "ready_long" | "ready_short";
}

// ─── Opportunity Mapping (matches watchlist/page.tsx) ──────────────────────

function oppKey(c: CoinAnalysis): OppKey {
  if (c.recommendation === "ready") {
    if (c.position === "long") return "ready_long";
    if (c.position === "short") return "ready_short";
    return "watch";
  }
  if (c.recommendation === "wait") {
    if (c.position === "long" || c.position === "short") return "watch";
    return "wait";
  }
  if (c.status === "wait") return "weakening";
  return "invalid";
}

// ─── Watcher Hook ──────────────────────────────────────────────────────────
// Runs every 60s. Compares prev snapshot with current. Fires onTransition
// for watch → ready_long | ready_short. Duplicate protection via lastNotified.

const INTERVAL_MS = 60_000;
const NON_READY_KEYS: ReadonlySet<OppKey> = new Set(["watch", "wait", "weakening", "invalid"]);
const READY_KEYS: ReadonlySet<OppKey> = new Set(["ready_long", "ready_short"]);

function useOpportunityWatcher(
  onTransition: (coinId: string, symbol: string, oppKey: "ready_long" | "ready_short") => void
) {
  const coins = useStore((s) => s.coins);
  const prevSnap = useRef<Map<string, OppKey>>(new Map());
  const lastNotif = useRef<Map<string, OppKey>>(new Map());
  const checkRef = useRef<() => void>();
  const onTransitionRef = useRef(onTransition);
  const firstCheckDone = useRef(false);
  useEffect(() => { onTransitionRef.current = onTransition; }, [onTransition]);

  const check = useCallback(() => {
    const curr = new Map<string, OppKey>();
    for (const c of coins) {
      const key = oppKey(c);
      curr.set(c.coinId, key);

      const prev = prevSnap.current.get(c.coinId);
      // Transition: any non-ready → ready
      if (prev !== undefined && NON_READY_KEYS.has(prev) && READY_KEYS.has(key)) {
        // Duplicate protection: skip if we already notified for this exact state
        if (lastNotif.current.get(c.coinId) !== key) {
          lastNotif.current.set(c.coinId, key);
          onTransitionRef.current(c.coinId, c.marketData.symbol.toUpperCase(), key as "ready_long" | "ready_short");
        }
      }
      // Clear lastNotif if state moved away from notified state
      if (lastNotif.current.get(c.coinId) !== key) {
        lastNotif.current.delete(c.coinId);
      }
    }
    prevSnap.current = curr;

    // First load: notify top-3 ready coins that were ready at mount
    if (!firstCheckDone.current && coins.length > 0) {
      firstCheckDone.current = true;
      const ready = coins
        .filter((c) => READY_KEYS.has(oppKey(c)))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
      for (const c of ready) {
        const k = oppKey(c) as "ready_long" | "ready_short";
        if (!lastNotif.current.has(c.coinId)) {
          lastNotif.current.set(c.coinId, k);
          onTransitionRef.current(c.coinId, c.marketData.symbol.toUpperCase(), k);
        }
      }
    }
  }, [coins]);

  // Keep ref in sync (runs every render, always points to latest check)
  checkRef.current = check;

  // Stable 60s interval — never restarts, always calls latest check via ref
  useEffect(() => {
    const id = setInterval(() => checkRef.current?.(), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Run check immediately when coins change (after analysis refresh)
  useEffect(() => {
    if (coins.length === 0) return;
    checkRef.current?.();
  }, [coins]);
}

// ─── Progress Bar (CSS animation) ─────────────────────────────────────────

const progressStyles = `
@keyframes opp-toast-progress {
  from { width: 100%; }
  to   { width: 0%; }
}
.opp-progress {
  animation: opp-toast-progress 10s linear forwards;
}
`;

// ─── Toast Container ───────────────────────────────────────────────────────

export function ToastContainer() {
  const { t } = useI18n();
  const router = useRouter();
  const [queue, setQueue] = useState<QueuedNotif[]>([]);
  const [active, setActive] = useState<QueuedNotif | null>(null);
  const [visible, setVisible] = useState(false);
  const activeRef = useRef<QueuedNotif | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { activeRef.current = active; }, [active]);

  // ── Enqueue (called by watcher) ──
  const enqueue = useCallback((coinId: string, symbol: string, oppKey: "ready_long" | "ready_short") => {
    setQueue((prev) => {
      // Skip if already in queue OR currently visible
      if (prev.some((n) => n.coinId === coinId)) return prev;
      if (activeRef.current?.coinId === coinId) return prev;
      return [...prev, { coinId, symbol, oppKey }];
    });
  }, []);

  // ── Watcher ──
  useOpportunityWatcher(enqueue);

  // ── Show next from queue ──
  const showNext = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setActive(next);
      requestAnimationFrame(() => setVisible(true));
      return rest;
    });
  }, []);

  // ── Dismiss current toast ──
  const dismiss = useCallback(() => {
    setVisible(false);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      setActive(null);
      showNext();
    }, 250);
  }, [showNext]);

  // ── Auto-dismiss after 10s ──
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(dismiss, 10_000);
    return () => clearTimeout(timer);
  }, [active, dismiss]);

  // ── Show next when queue changes ──
  useEffect(() => {
    if (!active && queue.length > 0) showNext();
  }, [queue, active, showNext]);

  // ── Click: navigate + dismiss ──
  const handleClick = useCallback(() => {
    if (!active) return;
    router.push(`/coin/${active.coinId}`);
    // Don't wait for navigation, dismiss immediately
    setVisible(false);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    setActive(null);
    showNext();
  }, [active, router, showNext]);

  // ── Render ──
  if (!active) return null;

  const isLong = active.oppKey === "ready_long";
  const emoji = isLong ? "🟢" : "🔴";
  const titleKey = isLong ? "notification.ready_long" : "notification.ready_short";

  return (
    <>
      <style>{progressStyles}</style>
      <div className="fixed bottom-4 right-4 z-[999] max-sm:left-4 sm:max-w-sm">
        <div
          className={`
            cursor-pointer rounded-lg shadow-2xl border overflow-hidden
            transition-all duration-250 ease-out
            ${visible
              ? "translate-y-0 opacity-100 scale-100"
              : "translate-y-3 opacity-0 scale-95 pointer-events-none"
            }
            ${isLong
              ? "bg-emerald-950/95 border-emerald-700/50"
              : "bg-red-950/95 border-red-700/50"
            }
            backdrop-blur-md
          `}
          onClick={handleClick}
          role="alert"
          aria-live="polite"
        >
          {/* Body */}
          <div className="flex items-center gap-3 px-4 py-3 min-w-[260px]">
            <span className="text-lg">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{active.symbol}</p>
              <p className="text-xs text-gray-300/90">{t(titleKey)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(); }}
              className="text-gray-500 hover:text-white transition-colors text-lg leading-none self-start mt-0.5"
              aria-label={t("notification.close")}
            >
              ×
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 bg-gray-800/60">
            <div className={`h-full ${isLong ? "bg-emerald-400" : "bg-red-400"} opp-progress`} />
          </div>
        </div>
      </div>
    </>
  );
}
