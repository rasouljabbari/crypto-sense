export function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const recent = changes.slice(-period);
  let avgGain = 0;
  let avgLoss = 0;
  for (const c of recent) {
    if (c > 0) avgGain += c;
    else avgLoss -= c;
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

export function estimatePosition(changePercent: number): {
  position: "long" | "short" | "neutral";
  score: number;
} {
  if (changePercent > 3) return { position: "long", score: Math.min(100, 50 + changePercent * 3) };
  if (changePercent < -3) return { position: "short", score: Math.max(0, 50 + changePercent * 3) };
  return { position: "neutral", score: 50 };
}
