import { PositionType } from "./types";

export interface PositionLabel {
  labelKey: string;
  text: string;
  bg: string;
  border: string;
}

export function getPositionLabel(score: number, position: PositionType): PositionLabel {
  if (position === "long") {
    if (score >= 80) {
      return {
        labelKey: "coin_row.strong_buy",
        text: "text-emerald-400",
        bg: "bg-emerald-900/40",
        border: "border-emerald-500/30",
      };
    }
    return {
      labelKey: "coin_row.buy",
      text: "text-green-400",
      bg: "bg-green-900/40",
      border: "border-green-500/30",
    };
  }

  if (position === "short") {
    if (score <= 20) {
      return {
        labelKey: "coin_row.strong_short",
        text: "text-red-400",
        bg: "bg-red-900/40",
        border: "border-red-500/30",
      };
    }
    return {
      labelKey: "coin_row.short_entry",
      text: "text-orange-400",
      bg: "bg-orange-900/40",
      border: "border-orange-500/30",
    };
  }

  if (score >= 50) {
    return {
      labelKey: "coin_row.hold",
      text: "text-yellow-400",
      bg: "bg-yellow-900/40",
      border: "border-yellow-500/30",
    };
  }
  return {
    labelKey: "coin_row.watch",
    text: "text-gray-400",
    bg: "bg-gray-800/40",
    border: "border-gray-500/30",
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
