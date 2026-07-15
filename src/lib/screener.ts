import { MarketData, SignalType, RiskLevel, TrendLabel, TradeStatus } from "./types";
import { analyzeAllCoins } from "./analysisEngine";
import { fetchMarketDataList } from "@/api/binance";

export interface ScreenerCoin {
  symbol: string;
  name: string;
  overallScore: number;
  signal: SignalType;
  confidence: number;
  tradeQuality: number;
  risk: RiskLevel;
  riskReward: string | null;
  trend: TrendLabel;
  status: TradeStatus;
  currentPrice: number;
  change24h: number;
}

export interface ScreenerParams {
  sortBy?: "overallScore" | "signal" | "confidence" | "tradeQuality" | "risk" | "trend" | "status" | "price" | "change24h";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  search?: string;
  minScore?: number;
  maxScore?: number;
  signal?: SignalType | "all";
  risk?: RiskLevel | "all";
  status?: TradeStatus | "all";
  trend?: TrendLabel | "all";
}

export interface ScreenerResult {
  items: ScreenerCoin[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const signalRank: Record<SignalType, number> = {
  strong_buy: 5, buy: 4, neutral: 3, sell: 2, strong_sell: 1,
};

const trendRank: Record<TrendLabel, number> = {
  strong_bullish: 5, bullish: 4, sideways: 3, bearish: 2, strong_bearish: 1,
};

const riskRank: Record<RiskLevel, number> = {
  low: 1, medium: 2, high: 3,
};

const statusRank: Record<TradeStatus, number> = {
  ready: 3, wait: 2, no_trade: 1,
};

function toScreenerCoin(analysis: {
  marketData: MarketData;
  overallScore: number;
  signal: SignalType;
  confidence: number;
  tradeQuality: number;
  riskLevel: RiskLevel;
  riskReward: string | null;
  trendLabel: TrendLabel;
  status: TradeStatus;
}): ScreenerCoin {
  return {
    symbol: analysis.marketData.symbol,
    name: analysis.marketData.name,
    overallScore: analysis.overallScore,
    signal: analysis.signal,
    confidence: analysis.confidence,
    tradeQuality: analysis.tradeQuality,
    risk: analysis.riskLevel,
    riskReward: analysis.riskReward,
    trend: analysis.trendLabel,
    status: analysis.status,
    currentPrice: analysis.marketData.currentPrice,
    change24h: analysis.marketData.priceChangePercent24h,
  };
}

export function screenCoins(
  marketDataList: MarketData[],
  params: ScreenerParams = {}
): ScreenerResult {
  const {
    sortBy = "overallScore",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
    search = "",
    minScore,
    maxScore,
    signal: signalFilter = "all",
    risk: riskFilter = "all",
    status: statusFilter = "all",
    trend: trendFilter = "all",
  } = params;

  const analyzed = analyzeAllCoins(marketDataList);

  let filtered = analyzed;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.marketData.symbol.toLowerCase().includes(q) ||
        c.marketData.name.toLowerCase().includes(q)
    );
  }

  if (minScore !== undefined) {
    filtered = filtered.filter((c) => c.overallScore >= minScore);
  }
  if (maxScore !== undefined) {
    filtered = filtered.filter((c) => c.overallScore <= maxScore);
  }
  if (signalFilter !== "all") {
    filtered = filtered.filter((c) => c.signal === signalFilter);
  }
  if (riskFilter !== "all") {
    filtered = filtered.filter((c) => c.riskLevel === riskFilter);
  }
  if (statusFilter !== "all") {
    filtered = filtered.filter((c) => c.status === statusFilter);
  }
  if (trendFilter !== "all") {
    filtered = filtered.filter((c) => c.trendLabel === trendFilter);
  }

  filtered.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "overallScore":
        cmp = a.overallScore - b.overallScore;
        break;
      case "confidence":
        cmp = a.confidence - b.confidence;
        break;
      case "tradeQuality":
        cmp = a.tradeQuality - b.tradeQuality;
        break;
      case "price":
        cmp = a.marketData.currentPrice - b.marketData.currentPrice;
        break;
      case "change24h":
        cmp = a.marketData.priceChangePercent24h - b.marketData.priceChangePercent24h;
        break;
      case "signal":
        cmp = signalRank[a.signal] - signalRank[b.signal];
        break;
      case "risk":
        cmp = riskRank[a.riskLevel] - riskRank[b.riskLevel];
        break;
      case "trend":
        cmp = trendRank[a.trendLabel] - trendRank[b.trendLabel];
        break;
      case "status":
        cmp = statusRank[a.status] - statusRank[b.status];
        break;
    }
    return sortOrder === "desc" ? -cmp : cmp;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return {
    items: paged.map(toScreenerCoin),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function fetchAndScreenCoins(
  params?: ScreenerParams
): Promise<ScreenerResult> {
  const marketData = await fetchMarketDataList();
  return screenCoins(marketData, params);
}
