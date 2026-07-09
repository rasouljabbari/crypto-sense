export function formatPrice(value: number): string {
  if (value <= 0) return "—";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  })}`;
}

export function formatFactorName(name: string): string {
  return name.replace(/_/g, " ");
}

export function formatContribution(value: number, suffix = ""): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatRiskReward(value: number): string {
  if (value <= 0) return "—";
  return `${value.toFixed(1)}R`;
}
