import type { MarketAnalysisResult } from "../../market-analyzer/types";

function formatLabel(label: string): string {
  return label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function buildPrompt(analysis: MarketAnalysisResult): string {
  const lines: string[] = [
    "You are a professional crypto analyst. Never invent data. Never calculate.",
    "",
    "ABSOLUTE RULES:",
    "- NEVER invent numbers, prices, percentages, or values.",
    "- NEVER change any provided value.",
    "- NEVER calculate indicators, ratios, or scores.",
    "- NEVER generate fake prices or targets.",
    "- ONLY explain the data below. Do not add new data.",
    "- Maximum 200 words total across all fields.",
    "- Use professional, concise trading language.",
    "- Return ONLY valid JSON. No markdown. No code fences. No commentary.",
    "",
    "Output JSON schema:",
    `{`,
    `  "executiveSummary": "2-3 sentence overview of current market state",`,
    `  "whyBuy": ["reason based on data", ...],`,
    `  "whySell": ["reason based on data", ...],`,
    `  "marketSituation": "2-3 sentences describing current market conditions",`,
    `  "mainRisks": ["risk based on data", ...],`,
    `  "opportunities": ["opportunity based on data", ...],`,
    `  "shortConclusion": "1-2 sentence bottom line",`,
    `  "disclaimer": "standard trading risk disclaimer"`,
    `}`,
    "",
    "MARKET DATA:",
    "",
    `Price: ${analysis.currentPrice}`,
    `Candles Analyzed: ${analysis.candleCount}`,
    "",
    "INDICATORS:",
  ];

  const ind = analysis.indicators;

  lines.push("");
  lines.push(`RSI(14): ${ind.rsi.value}${ind.rsi.oversold ? " (oversold)" : ""}${ind.rsi.overbought ? " (overbought)" : ""}`);
  lines.push(`MACD(12,26,9): value=${ind.macd.value.toFixed(4)}, signal=${ind.macd.signal.toFixed(4)}, histogram=${ind.macd.histogram.toFixed(4)}, ${ind.macd.bullish ? "bullish" : "bearish"}`);
  lines.push(`EMA20: ${ind.ema20.value.toFixed(4)}`);
  lines.push(`EMA50: ${ind.ema50.value.toFixed(4)}`);
  lines.push(`EMA200: ${ind.ema200.value.toFixed(4)}`);
  lines.push(`Bollinger Bands: upper=${ind.bollingerBands.upper.toFixed(4)}, middle=${ind.bollingerBands.middle.toFixed(4)}, lower=${ind.bollingerBands.lower.toFixed(4)}, width=${ind.bollingerBands.width.toFixed(4)}`);
  lines.push(`ATR(14): ${ind.atr.value.toFixed(4)}`);
  lines.push(`ADX(14): ${ind.adx.adx.toFixed(4)}, +DI=${ind.adx.plusDI.toFixed(4)}, -DI=${ind.adx.minusDI.toFixed(4)}, trend=${ind.adx.trend}`);
  lines.push(`OBV: value=${ind.obv.value.toFixed(4)}, trend=${ind.obv.trend}`);
  lines.push(`VWAP: ${ind.vwap.value.toFixed(4)}`);
  lines.push(`Support Levels: ${ind.support.levels.join(", ")}`);
  lines.push(`Resistance Levels: ${ind.resistance.levels.join(", ")}`);
  lines.push(`Trend Direction: ${ind.trendDirection.direction}`);
  lines.push(`Trend Strength: ${ind.trendStrength.label} (${ind.trendStrength.value.toFixed(2)})`);
  lines.push(`Volatility: ${ind.volatility.label} (annualized=${(ind.volatility.annualized * 100).toFixed(2)}%)`);

  lines.push("");
  lines.push("SCORES:");
  const sc = analysis.scores;
  lines.push(`Technical: ${sc.technical}/100 (${formatLabel(sc.breakdown.technical.label)})`);
  lines.push(`Trend: ${sc.trend}/100 (${formatLabel(sc.breakdown.trend.label)})`);
  lines.push(`Momentum: ${sc.momentum}/100 (${formatLabel(sc.breakdown.momentum.label)})`);
  lines.push(`Volume: ${sc.volume}/100 (${formatLabel(sc.breakdown.volume.label)})`);
  lines.push(`Volatility Score: ${sc.volatilityScore}/100 (${formatLabel(sc.breakdown.volatilityScore.label)})`);
  lines.push(`Overall: ${sc.overall}/100 (${formatLabel(sc.breakdown.overall.label)})`);
  lines.push(`Confidence: ${sc.confidence}/100`);

  lines.push("");
  lines.push("SIGNAL:");
  lines.push(`Action: ${analysis.signal.action}`);
  lines.push(`Score: ${analysis.signal.score}`);

  lines.push("");
  lines.push("RISK:");
  const rs = analysis.risk;
  lines.push(`Risk Score: ${rs.riskScore}/100`);
  lines.push(`Risk Level: ${rs.riskLevel}`);
  lines.push(`Suggested Stop Loss: ${rs.suggestedStopLoss.toFixed(4)}`);

  const ts = analysis.tradeSetup;
  if (ts.entry > 0) {
    lines.push("");
    lines.push("TRADE SETUP:");
    lines.push(`Direction: ${ts.direction}`);
    lines.push(`Entry: ${ts.entry}`);
    lines.push(`Stop Loss: ${ts.stopLoss}`);
    lines.push(`Take Profit 1 (R:R 1:2): ${ts.takeProfit.tp1}`);
    lines.push(`Take Profit 2 (R:R 1:3): ${ts.takeProfit.tp2}`);
    lines.push(`Take Profit 3 (R:R 1:5): ${ts.takeProfit.tp3}`);
    lines.push(`Trade Quality: ${ts.tradeQuality}/100`);
    lines.push(`Validation: ${ts.validation.isValid ? "Passed" : "Failed — " + (ts.validation.reason ?? "")}`);
  }

  lines.push("---");
  lines.push("Remember: maximum 200 words. Return ONLY valid JSON matching the schema above. Never invent data.");

  return lines.join("\n");
}
