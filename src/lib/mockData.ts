import { MarketData, TechnicalIndicators, NewsItem } from "./types";

function calculateSupportResistance(
  currentPrice: number,
  high24h: number,
  low24h: number,
  volume24h: number,
  marketCap: number,
  rsi: number,
  ema9: number,
  ema20: number,
  ema21: number,
  ema50: number,
  ema200: number,
  bbUpper: number,
  bbLower: number,
  priceChangePercent24h: number,
): { supportLevels: number[]; resistanceLevels: number[] } {
  const range = high24h - low24h;
  const volMcapRatio = marketCap > 0 ? volume24h / marketCap : 0;
  const trendStrength = Math.min(Math.abs(priceChangePercent24h) / 5, 1);
  const isBullish = priceChangePercent24h > 0;

  const candidates: { price: number; score: number; type: "support" | "resistance" }[] = [];

  // normalize distance to give higher score to nearer levels
  const distScore = (price: number) => {
    const rel = Math.abs(price - currentPrice) / currentPrice;
    if (rel < 0.005) return 25;
    if (rel < 0.015) return 20;
    if (rel < 0.03) return 15;
    if (rel < 0.06) return 10;
    if (rel < 0.12) return 5;
    return 0;
  };

  const push = (price: number, base: number, type: "support" | "resistance") => {
    if (price <= 0 || isNaN(price) || !isFinite(price)) return;
    if (Math.abs(price - currentPrice) / currentPrice < 0.0005) return;
    candidates.push({ price, score: base + distScore(price), type });
  };

  // 1. Pivot points (standard floor pivots adapted)
  const pivot = (high24h + low24h + currentPrice) / 3;
  const r1 = pivot + (high24h - low24h) * 0.382;
  const r2 = pivot + (high24h - low24h) * 0.618;
  const r3 = pivot + (high24h - low24h) * 1.0;
  const s1 = pivot - (high24h - low24h) * 0.382;
  const s2 = pivot - (high24h - low24h) * 0.618;
  const s3 = pivot - (high24h - low24h) * 1.0;
  push(r1, 45, "resistance");
  push(r2, 40, "resistance");
  push(r3, 35, "resistance");
  push(s1, 45, "support");
  push(s2, 40, "support");
  push(s3, 35, "support");

  // 2. Fibonacci retracements of 24h range
  const fibs = [0.236, 0.382, 0.5, 0.618, 0.786];
  for (const f of fibs) {
    const price = low24h + range * f;
    const base = Math.round(40 + f * 30);
    const type = price >= currentPrice ? "resistance" : "support";
    push(price, base, type);
  }

  // 3. Fibonacci extensions beyond the 24h range
  const exts = [1.272, 1.618];
  for (const f of exts) {
    push(high24h + range * (f - 1), 30, "resistance");
    push(low24h - range * (f - 1), 30, "support");
  }

  // 4. EMAs as dynamic S/R
  const emaEntries: { price: number; weight: number }[] = [
    { price: ema9, weight: 65 },
    { price: ema20, weight: 68 },
    { price: ema21, weight: 70 },
    { price: ema50, weight: 75 },
    { price: ema200, weight: 85 },
  ];
  for (const e of emaEntries) {
    if (e.price <= 0 || isNaN(e.price)) continue;
    const type = e.price < currentPrice ? "support" : "resistance";
    push(e.price, e.weight, type);
  }

  // 5. Bollinger Bands as extreme S/R
  push(bbUpper, 75, "resistance");
  push(bbLower, 75, "support");

  // 6. Psychological round numbers
  const mag = Math.pow(10, Math.floor(Math.log10(currentPrice)));
  const fineMag = mag / 10;
  const roundCandidates = new Set<number>();
  for (let i = -10; i <= 10; i++) {
    const rough = Math.round(currentPrice / mag) * mag + i * mag;
    if (rough > 0) roundCandidates.add(rough);
    const fine = Math.round(currentPrice / fineMag) * fineMag + i * fineMag;
    if (fine > 0) roundCandidates.add(fine);
  }
  for (const price of roundCandidates) {
    const relDiff = Math.abs(price - currentPrice) / currentPrice;
    if (relDiff < 0.001 || relDiff > 0.15) continue;
    const isMajor = price % (mag * 10) === 0 || price % mag === 0;
    const isMinor = price % fineMag === 0;
    const roundScore = isMajor ? 30 : isMinor ? 15 : 0;
    if (roundScore === 0) continue;
    const type = price < currentPrice ? "support" : "resistance";
    push(price, roundScore + 40, type);
  }

  // 7. Volume-profile proxy: wider range when volume is high = more established levels
  if (volMcapRatio > 0.15) {
    for (const c of candidates) c.score += 8;
  } else if (volMcapRatio > 0.08) {
    for (const c of candidates) c.score += 4;
  }

  // 8. RSI context: boost nearby levels in overbought/oversold
  if (rsi > 70) {
    candidates
      .filter((c) => c.type === "resistance" && distScore(c.price) >= 15)
      .forEach((c) => (c.score += 15));
  } else if (rsi < 30) {
    candidates
      .filter((c) => c.type === "support" && distScore(c.price) >= 15)
      .forEach((c) => (c.score += 15));
  }

  // 9. Trend strength via DMI proxy: strong trend weakens counter-trend levels
  if (trendStrength > 0.6) {
    if (isBullish) {
      candidates.filter((c) => c.type === "resistance").forEach((c) => (c.score -= 6));
      candidates.filter((c) => c.type === "support").forEach((c) => (c.score += 6));
    } else {
      candidates.filter((c) => c.type === "support").forEach((c) => (c.score -= 6));
      candidates.filter((c) => c.type === "resistance").forEach((c) => (c.score += 6));
    }
  }

  // deduplicate nearby levels (merge within 0.3% distance)
  const dedupe = (items: typeof candidates) => {
    const sorted = [...items].sort((a, b) => a.price - b.price);
    const merged: typeof candidates = [];
    for (const item of sorted) {
      const threshold = currentPrice * 0.003;
      const existing = merged.find((m) => Math.abs(m.price - item.price) < threshold);
      if (existing) {
        existing.score = Math.max(existing.score, item.score);
        existing.price = (existing.price + item.price) / 2;
      } else {
        merged.push({ ...item });
      }
    }
    return merged;
  };

  const all = dedupe(candidates);

  // separate & sort by proximity then score
  let supports = all
    .filter((c) => c.type === "support" && c.price < currentPrice)
    .sort((a, b) => b.price - a.price);
  let resistances = all
    .filter((c) => c.type === "resistance" && c.price > currentPrice)
    .sort((a, b) => a.price - b.price);

  // pick diverse levels: prefer closest but ensure at least ~1% separation
  const pickDiverse = (
    items: typeof candidates,
    count: number,
  ): number[] => {
    // sort by combined rank (proximity + score)
    const ranked = [...items].sort((a, b) => {
      const aProx = Math.abs(a.price - currentPrice);
      const bProx = Math.abs(b.price - currentPrice);
      const aRank = aProx * 0.7 - a.score * 0.3;
      const bRank = bProx * 0.7 - b.score * 0.3;
      return aRank - bRank;
    });
    const picked: number[] = [];
    for (const item of ranked) {
      if (picked.length >= count) break;
      const sep = currentPrice * 0.008;
      const diverse = picked.every((p) => Math.abs(p - item.price) > sep);
      if (diverse) picked.push(item.price);
    }
    return picked;
  };

  // also ensure we don't pick levels too close to each other
  let supportPrices = pickDiverse(supports, 3);
  let resistancePrices = pickDiverse(resistances, 3);

  // sort output: support descending (farthest first), resistance ascending (closest first)
  supportPrices.sort((a, b) => b - a);
  resistancePrices.sort((a, b) => a - b);

  // pad to exactly 3 levels
  while (supportPrices.length < 3) {
    const next =
      supportPrices.length === 0
        ? currentPrice * 0.95
        : supportPrices[supportPrices.length - 1] * (1 - 0.015 * (3 - supportPrices.length));
    supportPrices.push(Math.round(next * 100) / 100);
  }
  while (resistancePrices.length < 3) {
    const next =
      resistancePrices.length === 0
        ? currentPrice * 1.05
        : resistancePrices[resistancePrices.length - 1] * (1 + 0.015 * (3 - resistancePrices.length));
    resistancePrices.push(Math.round(next * 100) / 100);
  }

  supportPrices = supportPrices.map((p) => Math.round(p * 100) / 100);
  resistancePrices = resistancePrices.map((p) => Math.round(p * 100) / 100);

  return { supportLevels: supportPrices, resistanceLevels: resistancePrices };
}

export function generateTechnicalIndicators(marketData: MarketData): TechnicalIndicators {
  const { currentPrice, high24h, low24h, volume24h, marketCap, priceChangePercent24h } = marketData;

  const rsi = 40 + Math.random() * 40;
  const macdValue = Math.random() * 20 - 10;
  const macdSignal = macdValue + (Math.random() - 0.5) * 4;
  const ema9 = currentPrice * (1 + (Math.random() - 0.5) * 0.008);
  const ema20 = currentPrice * (1 + (Math.random() - 0.5) * 0.012);
  const ema21 = currentPrice * (1 + (Math.random() - 0.5) * 0.015);
  const ema50 = currentPrice * (1 + (Math.random() - 0.5) * 0.025);
  const ema200 = currentPrice * (1 + (Math.random() - 0.5) * 0.06);
  const bbUpper = currentPrice * (1 + 0.015 + Math.random() * 0.01);
  const bbLower = currentPrice * (1 - 0.015 - Math.random() * 0.01);
  const adx = 15 + Math.random() * 30;
  const atr = currentPrice * (0.01 + Math.random() * 0.03);

  const { supportLevels, resistanceLevels } = calculateSupportResistance(
    currentPrice,
    high24h,
    low24h,
    volume24h,
    marketCap,
    rsi,
    ema9,
    ema20,
    ema21,
    ema50,
    ema200,
    bbUpper,
    bbLower,
    priceChangePercent24h,
  );

  return {
    rsi,
    macd: {
      value: macdValue,
      signal: macdSignal,
      histogram: macdValue - macdSignal,
    },
    ema9,
    ema20,
    ema21,
    ema50,
    ema200,
    bollingerBands: {
      upper: bbUpper,
      middle: currentPrice,
      lower: bbLower,
    },
    supportLevels,
    resistanceLevels,
    adx,
    atr,
  };
}

export const MOCK_NEWS: NewsItem[] = [
  { id: "n1", title: "Bitcoin ETF Inflows Surge Past $1B in Weekly Record", source: "CoinDesk", url: "https://www.ig.com/za/news-and-trade-ideas/bitcoin-outlook--etf-inflows--institutional-demand-and-geopoliti-260527", publishedAt: new Date().toISOString(), sentiment: "positive", relatedCoins: ["bitcoin"], summary: "Spot Bitcoin ETFs saw record weekly inflows exceeding $1 billion." },
  { id: "n2", title: "Ethereum Layer 2 Solutions Hit New TVL Milestone", source: "The Block", url: "https://finance.yahoo.com/news/most-ethereum-l2s-may-not-132236473.html", publishedAt: new Date().toISOString(), sentiment: "positive", relatedCoins: ["ethereum"], summary: "Total value locked in Ethereum L2s reaches all-time high." },
  { id: "n3", title: "Solana Network Activity Reaches ATH as Meme Coin Trading Booms", source: "CoinTelegraph", url: "https://www.dextools.io/news/solana-alpenglow-firedancer-jito-tvl-recovery-may-2026-news", publishedAt: new Date().toISOString(), sentiment: "positive", relatedCoins: ["solana"], summary: "Daily active addresses on Solana hit a new all-time high." },
  { id: "n4", title: "SEC Delays Decision on Multiple Crypto ETF Applications", source: "Bloomberg", url: "https://finance.yahoo.com/markets/crypto/articles/sec-delays-plan-allowing-crypto-183356839.html", publishedAt: new Date().toISOString(), sentiment: "negative", relatedCoins: ["bitcoin", "ethereum"], summary: "The SEC has postponed rulings on several pending crypto ETF proposals." },
  { id: "n5", title: "Cardano Van Rossum Hard Fork: Key Upgrade Goes Live Successfully", source: "Cardano Foundation", url: "https://www.kucoin.com/blog/cardano-plans-hard-fork-for-april-2026-protocol-upgrade-what-you-need-to-know", publishedAt: new Date(Date.now() - 86400000).toISOString(), sentiment: "positive", relatedCoins: ["cardano"], summary: "The Van Rossum hard fork brings significant scalability improvements." },
  { id: "n6", title: "Chainlink CCIP Integrated by Major Banking Institutions", source: "Reuters", url: "https://chainlinktoday.com/big-four-firm-deloitte-touche-llp-completes-soc-2-type-2-examination-for-chainlink-data-feeds-and-ccip", publishedAt: new Date().toISOString(), sentiment: "positive", relatedCoins: ["chainlink"], summary: "Several major banks adopt Chainlink's cross-chain protocol." },
  { id: "n7", title: "Regulatory Concerns Mount Over Stablecoin Legislation Stalemate", source: "Financial Times", url: "https://www.blockchain-council.org/cryptocurrency/stablecoin-regulation-2026-reserve-licensing-audit-requirements/", publishedAt: new Date().toISOString(), sentiment: "negative", relatedCoins: ["ethereum", "solana"], summary: "Lack of progress on stablecoin regulation creates market uncertainty." },
  { id: "n8", title: "Avalanche Announces $40M Retro9000 Grant Program for Developers", source: "Avalanche Blog", url: "https://www.avax.network/about/blog/retro9000-a-usd40m-grant-program-rewards-developers-driving-avalanche", publishedAt: new Date(Date.now() - 7200000).toISOString(), sentiment: "positive", relatedCoins: ["avalanche"], summary: "New initiative to boost development on the Avalanche ecosystem." },
];
