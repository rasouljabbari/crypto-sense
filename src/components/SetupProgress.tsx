"use client";

import { useI18n } from "@/i18n/context";
import type { StageInfo, StageId } from "@/lib/setupProgress";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

// ─── Props ─────────────────────────────────────────────────────────────────

export type SetupProgressSize = "sm" | "md" | "lg";

export interface SetupProgressProps {
  /** Pre-computed stage states. 6 items, ordered. */
  readonly stages: readonly StageInfo[];
  /** True when every stage completed. */
  readonly allCompleted: boolean;
  /** True when any stage failed. */
  readonly hasFailed: boolean;
  /** True when any stage is still pending. */
  readonly hasPending: boolean;
  /** Trade direction when allCompleted. */
  readonly direction: "long" | "short" | null;
  /** i18n key for final status label. */
  readonly finalStatusKey: string;
  /** Size variant. "sm" for tables/minimal, "md" default, "lg" for detail view. */
  readonly size?: SetupProgressSize;
  /** Compact variant — horizontal dot row without labels. Overrides size. */
  readonly compact?: boolean;
  readonly className?: string;
}

// ─── Stage SVG Icons ───────────────────────────────────────────────────────

function ChartIcon({ className }: { readonly className?: string }): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16L6.5 10L9.5 13L14 7L18 10" />
      <rect x="1.5" y="1.5" width="17" height="17" rx="2" />
    </svg>
  );
}

function LayersIcon({ className }: { readonly className?: string }): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L18 7L10 12L2 7L10 2Z" />
      <path d="M2 12L10 17L18 12" />
      <path d="M10 7L18 12M10 7L2 12" strokeDasharray="0.5 1" />
    </svg>
  );
}

function LightningIcon({ className }: { readonly className?: string }): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 1.5L3.5 11H9.5L8 18.5L17 9.5H11L11.5 1.5Z" />
    </svg>
  );
}

function BarsIcon({ className }: { readonly className?: string }): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="3.5" height="6" rx="0.75" />
      <rect x="8.25" y="7.5" width="3.5" height="9.5" rx="0.75" />
      <rect x="13.5" y="4" width="3.5" height="13" rx="0.75" />
    </svg>
  );
}

function TargetIcon({ className }: { readonly className?: string }): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <circle cx="10" cy="10" r="4.5" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ShieldIcon({ className }: { readonly className?: string }): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 1.5L2.5 4.5V10C2.5 14.5 6 18 10 19C14 18 17.5 14.5 17.5 10V4.5L10 1.5Z" />
      <path d="M7.5 11L9 12.5L12.5 8.5" />
    </svg>
  );
}

const STAGE_ICONS: Record<StageId, (props: { readonly className?: string }) => ReactNode> = {
  market_context: ChartIcon,
  structure: LayersIcon,
  momentum: LightningIcon,
  volume: BarsIcon,
  trigger: TargetIcon,
  risk: ShieldIcon,
};

// ─── Stage i18n key map ────────────────────────────────────────────────────

const STAGE_I18N_KEY: Record<StageId, string> = {
  market_context: "setup_progress.stage.market_context",
  structure:      "setup_progress.stage.structure",
  momentum:       "setup_progress.stage.momentum",
  volume:         "setup_progress.stage.volume",
  trigger:        "setup_progress.stage.trigger",
  risk:           "setup_progress.stage.risk",
};

// ─── State config ──────────────────────────────────────────────────────────

interface StateVisual {
  iconLabel: string;
  dotBg: string;
  dotRing: string;
  lineBg: string;
  textColor: string;
  linePassed: string;
  lineCurrent: string;
  linePending: string;
}

function stateVisual(state: StageInfo["state"]): StateVisual {
  switch (state) {
    case "completed":
      return {
        iconLabel: "setup_progress.state.completed",
        dotBg: "bg-emerald-500",
        dotRing: "ring-emerald-500/30",
        lineBg: "bg-emerald-500/60",
        textColor: "text-emerald-400",
        linePassed: "bg-emerald-500/60",
        lineCurrent: "bg-emerald-500/60",
        linePending: "bg-gray-700/50",
      };
    case "current":
      return {
        iconLabel: "setup_progress.state.current",
        dotBg: "bg-blue-500",
        dotRing: "ring-blue-500/40",
        lineBg: "bg-blue-500/70",
        textColor: "text-blue-400",
        linePassed: "bg-blue-500/70",
        lineCurrent: "bg-blue-500/70",
        linePending: "bg-gray-700/50",
      };
    case "pending":
      return {
        iconLabel: "setup_progress.state.pending",
        dotBg: "bg-gray-600",
        dotRing: "ring-gray-600/30",
        lineBg: "bg-gray-700/50",
        textColor: "text-gray-500",
        linePassed: "bg-gray-700/50",
        lineCurrent: "bg-gray-700/50",
        linePending: "bg-gray-700/50",
      };
    case "failed":
      return {
        iconLabel: "setup_progress.state.failed",
        dotBg: "bg-red-500",
        dotRing: "ring-red-500/30",
        lineBg: "bg-red-500/60",
        textColor: "text-red-400",
        linePassed: "bg-red-500/60",
        lineCurrent: "bg-red-500/60",
        linePending: "bg-gray-700/50",
      };
  }
}

// ─── Entrance animation (staggered) ───────────────────────────────────────

function useStagger(delayMs = 80, deps: unknown[] = []) {
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [allIn, setAllIn] = useState(false);

  useEffect(() => {
    setVisible(new Set());
    setAllIn(false);
    const TO = 6;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < TO; i++) {
      timers.push(setTimeout(() => {
        setVisible((prev) => new Set([...prev, i]));
        if (i === TO - 1) setAllIn(true);
      }, i * delayMs));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { visible, allIn };
}

// ─── Size config ───────────────────────────────────────────────────────────

interface SizeConfig {
  dot: string;
  icon: string;
  connector: string;
  labelText: string;
  subText: string;
  badge: string;
  badgeIcon: string;
  spacing: string;
  padding: string;
  connectorGap: string;
}

const SIZE_MAP: Record<SetupProgressSize, SizeConfig> = {
  sm: {
    dot: "w-4 h-4",
    icon: "w-2.5 h-2.5",
    connector: "w-3",
    labelText: "text-[10px]",
    subText: "text-[8px]",
    badge: "text-[9px] px-1.5 py-0.5",
    badgeIcon: "text-[10px]",
    spacing: "gap-1",
    padding: "py-0.5",
    connectorGap: "mx-0.5",
  },
  md: {
    dot: "w-6 h-6",
    icon: "w-3.5 h-3.5",
    connector: "w-4",
    labelText: "text-xs",
    subText: "text-[10px]",
    badge: "text-[10px] px-2 py-1",
    badgeIcon: "text-xs",
    spacing: "gap-1.5",
    padding: "py-1",
    connectorGap: "mx-1",
  },
  lg: {
    dot: "w-7 h-7",
    icon: "w-4 h-4",
    connector: "w-5",
    labelText: "text-sm",
    subText: "text-[11px]",
    badge: "text-xs px-2.5 py-1",
    badgeIcon: "text-sm",
    spacing: "gap-2",
    padding: "py-1.5",
    connectorGap: "mx-1",
  },
};

// ─── Animation variants ────────────────────────────────────────────────────

const dotVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.35, ease: "backOut" },
  }),
};

const labelVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: "easeOut" },
  }),
};

const badgeVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "backOut" },
  },
};

const stateLabelVariants = {
  initial: { opacity: 0, y: -4, height: 0 },
  animate: { opacity: 1, y: 0, height: "auto", transition: { duration: 0.2 } },
  exit: { opacity: 0, y: 4, height: 0, transition: { duration: 0.15 } },
};

// ─── Component ─────────────────────────────────────────────────────────────

export function SetupProgress({
  stages,
  allCompleted,
  hasFailed,
  direction,
  finalStatusKey,
  size = "md",
  compact = false,
  className = "",
}: SetupProgressProps) {
  const { t, dir } = useI18n();
  const isRtl = dir === "rtl";

  // Compact forces sm size
  const effSize: SetupProgressSize = compact ? "sm" : size;
  const sz = SIZE_MAP[effSize];
  const delayMs = compact ? 50 : 80;

  // Re-stagger when stages identity changes
  const { visible, allIn } = useStagger(delayMs, [stages]);

  // ── Compact: horizontal dots row ──
  if (compact) {
    return (
      <div
        className={`flex items-center ${sz.spacing} ${className}`}
        role="progressbar"
        aria-label={t("setup_progress.aria_label")}
        aria-valuenow={stages.filter((s) => s.state === "completed").length}
        aria-valuemin={0}
        aria-valuemax={stages.length}
      >
        {stages.map((s, i) => {
          const sv = stateVisual(s.state);
          const Icon = STAGE_ICONS[s.id];
          const show = visible.has(i);
          const tooltip = `${t(STAGE_I18N_KEY[s.id])} — ${t(sv.iconLabel)}`;

          return (
            <motion.div
              key={s.id}
              custom={i}
              variants={dotVariants}
              initial="hidden"
              animate={show ? "visible" : "hidden"}
              className="flex items-center"
            >
              {/* Dot with icon */}
              <div
                className={`${sz.dot} rounded-full ring-2 flex items-center justify-center transition-colors duration-500 ${sv.dotBg} ${sv.dotRing} ${show ? "" : "invisible"}`}
                title={tooltip}
                aria-label={tooltip}
              >
                <Icon className={`${sz.icon} text-white`} />
              </div>
              {/* Connector */}
              {i < stages.length - 1 && (
                <div
                  className={`${sz.connector} h-[3px] rounded-full ${sz.connectorGap} transition-colors duration-500 ${
                    s.state === "completed" || s.state === "current"
                      ? sv.lineBg
                      : "bg-gray-700/50"
                  }`}
                />
              )}
            </motion.div>
          );
        })}

        {/* Final badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={allCompleted ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.35, ease: "backOut" }}
          className={`${sz.badge} font-bold rounded shrink-0 ${
            isRtl ? "mr-2" : "ml-1"
          } ${
            allCompleted
              ? direction === "long"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
              : "bg-transparent"
          }`}
        >
          {allCompleted ? t(finalStatusKey) : ""}
        </motion.div>
      </div>
    );
  }

  // ─── Full vertical timeline ────────────────────────────────────────────

  return (
    <div
      className={`relative ${className}`}
      role="progressbar"
      aria-label={t("setup_progress.aria_label")}
      aria-valuenow={stages.filter((s) => s.state === "completed").length}
      aria-valuemin={0}
      aria-valuemax={stages.length}
    >
      <div className="relative flex flex-col">
        {stages.map((s, i) => {
          const sv = stateVisual(s.state);
          const Icon = STAGE_ICONS[s.id];
          const show = visible.has(i);
          const isLast = i === stages.length - 1;
          const label = t(STAGE_I18N_KEY[s.id]);
          const stateLabel = t(sv.iconLabel);

          // Connector class: depends on previous stage state
          const prevS = i > 0 ? stages[i - 1] : null;
          const prevSv = prevS ? stateVisual(prevS.state) : null;
          const connectorAboveClass = prevS
            ? prevS.state === "completed" || prevS.state === "current"
              ? prevSv!.lineBg
              : "bg-gray-700/50"
            : "";

          const connectorBelowClass = !isLast
            ? s.state === "completed"
              ? sv.lineBg
              : s.state === "current"
                ? "bg-blue-500/40"
                : "bg-gray-700/50"
            : "";

          return (
            <div key={s.id} className="relative flex items-stretch">
              {/* ── Left column: dot + connector ── */}
              <div className="flex flex-col items-center w-8 shrink-0">
                {/* Connector above */}
                {i > 0 && (
                  <motion.div
                    layout
                    className={`w-0.5 flex-1 min-h-[6px] transition-colors duration-500 ${connectorAboveClass}`}
                  />
                )}

                {/* Dot with stage icon */}
                <motion.div
                  layout
                  custom={i}
                  variants={dotVariants}
                  initial="hidden"
                  animate={show ? "visible" : "hidden"}
                  className={`${sz.dot} rounded-full ring-2 flex items-center justify-center transition-colors duration-500 ${sv.dotBg} ${sv.dotRing} shrink-0`}
                  title={`${label} — ${stateLabel}`}
                  aria-label={`${label} — ${stateLabel}`}
                >
                  <Icon className={`${sz.icon} text-white`} />
                </motion.div>

                {/* Connector below */}
                {!isLast && (
                  <motion.div
                    layout
                    className={`w-0.5 flex-1 min-h-[6px] transition-colors duration-500 ${connectorBelowClass}`}
                  />
                )}
              </div>

              {/* ── Right column: label ── */}
              <motion.div
                custom={i}
                variants={labelVariants}
                initial="hidden"
                animate={show ? "visible" : "hidden"}
                className={`flex items-center min-h-0 ${isRtl ? "mr-3" : "ml-3"} ${sz.padding}`}
              >
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`font-semibold leading-tight transition-colors duration-300 ${sz.labelText} ${sv.textColor}`}
                  >
                    {label}
                  </span>

                  {/* Animated state label */}
                  <AnimatePresence mode="wait">
                    {(s.state === "completed" || s.state === "current") && (
                      <motion.span
                        key={s.state}
                        variants={stateLabelVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className={`${sz.subText} leading-tight overflow-hidden ${
                          s.state === "completed"
                            ? "text-emerald-500/70"
                            : "text-blue-400/70"
                        }`}
                      >
                        {stateLabel}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          );
        })}

        {/* ── Final Status Badge ── */}
        <motion.div
          variants={badgeVariants}
          initial="hidden"
          animate={allIn ? "visible" : "hidden"}
          className={`mt-3 ${isRtl ? "mr-9" : "ml-9"}`}
        >
          <motion.div
            layout
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold transition-colors duration-500 ${sz.badge} ${
              allCompleted
                ? direction === "long"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/15 border-red-500/30 text-red-400"
                : hasFailed
                  ? "bg-red-500/10 border-red-500/20 text-red-500"
                  : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
            } ${
              allCompleted || hasFailed || hasPending
                ? "opacity-100 scale-100"
                : "opacity-0 scale-75"
            }`}
          >
            {/* Direction icon */}
            <motion.span
              key={
                allCompleted
                  ? direction === "long" ? "long" : "short"
                  : hasFailed
                    ? "fail"
                    : "watch"
              }
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`${sz.badgeIcon} leading-none`}
            >
              {allCompleted
                ? direction === "long" ? "▲" : "▼"
                : hasFailed
                  ? "✗"
                  : "○"}
            </motion.span>
            {/* Label */}
            <span>{t(finalStatusKey)}</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
