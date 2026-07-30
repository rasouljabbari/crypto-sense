"use client";

import { useI18n } from "@/i18n/context";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

// ─── Props ─────────────────────────────────────────────────────────────────

export interface ReasonSummaryCardProps {
  /** "ready" | "wait" | "skip" */
  readonly recommendation: string;
  /** Trade direction when ready. */
  readonly direction: "long" | "short" | null;
  /** Already-translated reason strings (e.g. "✓ Strong Momentum"). */
  readonly reasons: readonly string[];
  /** Already-translated status label (e.g. "READY LONG"). */
  readonly statusLabel: string;
  /** Number of reasons visible before "+N More" fold. Default 3. */
  readonly initialShow?: number;
  readonly className?: string;
}

// ─── Animation variants ────────────────────────────────────────────────────

const expandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: "auto", opacity: 1, transition: { duration: 0.35, ease: "easeOut" } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: "easeOut" },
  }),
};

const badgeVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { duration: 0.3, ease: "backOut" } },
};

// ─── Component ─────────────────────────────────────────────────────────────

export function ReasonSummaryCard({
  recommendation,
  direction,
  reasons,
  statusLabel,
  initialShow = 3,
  className = "",
}: ReasonSummaryCardProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const isReady = recommendation === "ready";
  const isWait = recommendation === "wait";
  const visibleReasons = expanded ? reasons : reasons.slice(0, initialShow);
  const hiddenCount = reasons.length - initialShow;

  // Direction-based styling
  const badgeStyle = isReady
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : isWait
      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
      : "bg-red-500/15 text-red-400 border-red-500/30";

  const directionIcon = isReady
    ? direction === "short"
      ? "▼"
      : "▲"
    : isWait
      ? "●"
      : "×";

  const accentBorder = isReady
    ? "border-emerald-500/20"
    : isWait
      ? "border-yellow-500/20"
      : "border-red-500/20";

  const accentText = isReady
    ? "text-emerald-400"
    : isWait
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div
      className={`bg-gray-900/50 border border-gray-800 rounded-xl shadow-card transition-all duration-300 ${className}`}
    >
      <div className="p-4 sm:p-5">
        {/* ── Status badge row ── */}
        <motion.div
          variants={badgeVariants}
          initial="initial"
          animate="animate"
          className="flex items-center gap-2 mb-4"
        >
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${badgeStyle}`}
          >
            <span className="text-sm leading-none">{directionIcon}</span>
            <span>{statusLabel}</span>
          </div>
        </motion.div>

        {/* ── Why? heading ── */}
        {reasons.length > 0 && (
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2.5">
            {t("coin_analysis.signal_reasons.title")}
          </h4>
        )}

        {/* ── Reason list ── */}
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {visibleReasons.map((reason, i) => (
              <motion.div
                key={`${reason}-${i}`}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                layout
                className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border ${accentBorder} bg-gray-800/20`}
              >
                <span className={`text-[10px] font-bold shrink-0 mt-0.5 ${accentText}`}>✓</span>
                <span className="text-[11px] text-gray-300 leading-snug">{reason}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Expand / collapse toggle ── */}
        {reasons.length > initialShow && (
          <motion.button
            onClick={() => setExpanded((v) => !v)}
            className={`mt-3 text-[10px] font-semibold transition-colors ${accentText} hover:brightness-125`}
            whileTap={{ scale: 0.97 }}
          >
            {expanded
              ? t("reason_summary.show_less")
              : t("reason_summary.show_more", { count: hiddenCount })}
          </motion.button>
        )}

        {/* ── Empty state ── */}
        {reasons.length === 0 && (
          <p className="text-[11px] text-gray-500">{t("coin_analysis.signal_reasons.no_reasons")}</p>
        )}
      </div>
    </div>
  );
}
