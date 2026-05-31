import { PositionType } from "./types";

export interface PositionLabel {
  labelKey: string;
  text: string;
  bg: string;
  border: string;
}

export function getPositionLabel(score: number, position: PositionType): PositionLabel {
  if (position === "long") {
    return {
      labelKey: score >= 80 ? "coin_row.strong_buy" : "coin_row.buy",
      text: "text-emerald-400",
      bg: "bg-emerald-900/30",
      border: "border-emerald-500/30",
    };
  }

  if (position === "short") {
    return {
      labelKey: score <= 20 ? "coin_row.strong_short" : "coin_row.short_entry",
      text: "text-red-400",
      bg: "bg-red-900/30",
      border: "border-red-500/30",
    };
  }

  return {
    labelKey: score >= 50 ? "coin_row.hold" : "coin_row.watch",
    text: "text-yellow-400",
    bg: "bg-yellow-900/30",
    border: "border-yellow-500/30",
  };
}

export function getConvictionTextKey(score: number, position: PositionType): string {
  if (position === "long") {
    if (score >= 80) return "action_strong_buy";
    return "action_buy";
  }
  if (position === "short") {
    if (score <= 20) return "action_strong_short";
    return "action_short_entry";
  }
  if (score >= 50) return "action_hold";
  return "action_watch";
}
