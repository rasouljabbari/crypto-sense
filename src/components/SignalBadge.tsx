"use client";

import type { TradingSignalType } from "@/features/analysis-engine/services/signaling";

interface SignalBadgeProps {
  readonly signal: TradingSignalType;
  readonly label?: string;
  readonly className?: string;
}

const config: Record<
  TradingSignalType,
  { label: string; bg: string; text: string; dot: string }
> = {
  strong_buy: {
    label: "Strong Buy",
    bg: "bg-emerald-900/30",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  buy: {
    label: "Buy",
    bg: "bg-emerald-900/20",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  neutral: {
    label: "Neutral",
    bg: "bg-yellow-900/20",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
  },
  sell: {
    label: "Sell",
    bg: "bg-red-900/20",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  strong_sell: {
    label: "Strong Sell",
    bg: "bg-red-900/30",
    text: "text-red-400",
    dot: "bg-red-400",
  },
};

export function SignalBadge({ signal, label, className = "" }: SignalBadgeProps) {
  const c = config[signal];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${c.bg} ${c.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label ?? c.label}
    </span>
  );
}
