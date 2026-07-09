import type { MarketAnalysisResult } from "../../market-analyzer/types";

function indent(val: unknown, depth: number): string {
  const pad = "  ".repeat(depth);
  if (val === null) return "null";
  if (typeof val === "string") return `"${val}"`;
  if (typeof val === "number") return Number.isInteger(val) ? val.toString() : val.toFixed(4);
  if (typeof val === "boolean") return val.toString();
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    const items = val.map((v) => `${pad}  ${indent(v, depth + 1)}`).join(",\n");
    return `[\n${items}\n${pad}]`;
  }
  if (typeof val === "object") {
    const keys = Object.keys(val as Record<string, unknown>);
    if (keys.length === 0) return "{}";
    const entries = keys.map((k) => `${pad}  ${k}: ${indent((val as Record<string, unknown>)[k], depth + 1)}`);
    return `{\n${entries.join(",\n")}\n${pad}}`;
  }
  return String(val);
}

function formatLabel(label: string): string {
  return label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function buildPrompt(analysis: MarketAnalysisResult): string {
  const lines: string[] = [
    "You are a professional crypto analyst. Analyze the following market data and provide your assessment.",
    "",
    "RULES:",
    "- Never invent numbers.",
    "- Never change calculated values.",
    "- Never calculate indicators.",
    "- Explain only.",
    "- Maximum 250 words total.",
    "- Use professional trading language.",
    "- Return ONLY valid JSON. No markdown. No code fences. No commentary.",
    "",
    "Output JSON schema:",
    `{`,
    `  "summary": "brief overview of current market state",`,
    `  "whyBuy": ["reason 1", "reason 2", ...],`,
    `  "whySell": ["reason 1", "reason 2", ...],`,
    `  "opportunities": ["opportunity 1", ...],`,
    `  "risks": ["risk 1", ...],`,
    `  "newsSummary": "relevant news summary or empty string",`,
    `  "disclaimer": "standard trading disclaimer"`,
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
  lines.push(`RSI: ${ind.rsi.value}${ind.rsi.oversold ? " (oversold)" : ""}${ind.rsi.overbought ? " (overbought)" : ""}`);
  lines.push(`MACD: value=${ind.macd.value.toFixed(4)}, signal=${ind.macd.signal.toFixed(4)}, histogram=${ind.macd.histogram.toFixed(4)}, bullish=${ind.macd.bullish}`);
  lines.push(`SMA20: ${ind.sma20.value.toFixed(4)}`);
  lines.push(`EMA20: ${ind.ema20.value.toFixed(4)}`);
  lines.push(`EMA50: ${ind.ema50.value.toFixed(4)}`);
  lines.push(`EMA200: ${ind.ema200.value.toFixed(4)}`);
  lines.push(`Bollinger Bands: upper=${ind.bollingerBands.upper.toFixed(4)}, middle=${ind.bollingerBands.middle.toFixed(4)}, lower=${ind.bollingerBands.lower.toFixed(4)}, width=${ind.bollingerBands.width.toFixed(4)}`);
  lines.push(`ATR: ${ind.atr.value.toFixed(4)}`);
  lines.push(`ADX: ${ind.adx.adx.toFixed(4)}, +DI=${ind.adx.plusDI.toFixed(4)}, -DI=${ind.adx.minusDI.toFixed(4)}, trend=${ind.adx.trend}`);
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
  lines.push(`Risk Percentage: ${(rs.riskPercentage * 100).toFixed(2)}%`);

  const ts = analysis.tradeSetup;
  if (ts.entry > 0) {
    lines.push("");
    lines.push("TRADE SETUP:");
    lines.push(`Direction: ${ts.direction}`);
    lines.push(`Entry: ${ts.entry}`);
    lines.push(`Stop Loss: ${ts.stopLoss}`);
    lines.push(`Take Profit 1: ${ts.takeProfit.tp1}`);
    lines.push(`Take Profit 2: ${ts.takeProfit.tp2}`);
    lines.push(`Take Profit 3: ${ts.takeProfit.tp3}`);
    lines.push(`R:R TP1: ${ts.riskReward.tp1.toFixed(2)}`);
    lines.push(`R:R TP2: ${ts.riskReward.tp2.toFixed(2)}`);
    lines.push(`R:R TP3: ${ts.riskReward.tp3.toFixed(2)}`);
    lines.push(`Position Size: ${ts.position.positionSize.toFixed(4)}`);
    lines.push(`Risk Amount: ${ts.position.riskAmount.toFixed(2)}`);
    lines.push(`Expected Profit TP1: ${ts.expectedProfit.tp1.toFixed(2)}`);
    lines.push(`Trade Quality: ${ts.tradeQuality}/100`);
    lines.push(`Validation: ${ts.validation.isValid ? "Passed" : "Failed — " + (ts.validation.reason ?? "")}`);
  }

  lines.push("---");
  lines.push("Return ONLY valid JSON matching the schema above.");

  return lines.join("\n");
}
