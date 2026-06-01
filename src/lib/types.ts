export type PositionType = "long" | "short" | "neutral";

export interface MarketData {
  id: string;
  rank: number;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  circulatingSupply: number;
  totalSupply: number | null;
  ath: number;
  athDate: string;
  atl: number;
  atlDate: string;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  supportLevels: number[];
  resistanceLevels: number[];
}

export interface TrendAnalysis {
  shortTerm: "bullish" | "bearish" | "neutral";
  mediumTerm: "bullish" | "bearish" | "neutral";
  longTerm: "bullish" | "bearish" | "neutral";
  score: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
  relatedCoins: string[];
  summary: string;
}

export interface SentimentData {
  overall: "positive" | "negative" | "neutral";
  score: number;
  twitterMentions: number;
  positiveRatio: number;
  newsCount: number;
  recentNews: NewsItem[];
}

export interface CoinAnalysis {
  coinId: string;
  position: PositionType;
  overallScore: number;
  volumeScore: number;
  trendScore: number;
  sentimentScore: number;
  technicalScore: number;
  marketData: MarketData;
  technicalIndicators: TechnicalIndicators;
  trendAnalysis: TrendAnalysis;
  sentiment: SentimentData;
  lastUpdated: string;
}

export interface FilterOptions {
  positionType: PositionType | "all";
  minVolume: number;
  minScore: number;
  sortBy: "score" | "volume" | "priceChange" | "name" | "position" | "risk";
  sortOrder: "asc" | "desc";
}

export interface ChartDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketIndicators {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  bnbDominance: number;
  ethBtcRatio: number;
  bnbBtcRatio: number;
  totalExBtc: number;
  totalExTop10: number;
  usdtDominance: number;
  othersDominance: number;
  change?: {
    totalMarketCap: number;
    totalExBtc: number;
    totalExTop10: number;
    btcDominance: number;
    ethDominance: number;
    usdtDominance: number;
    othersDominance: number;
  };
}

export interface WebSocketMessage {
  type: "price_update" | "analysis_update" | "news_alert";
  data: Partial<CoinAnalysis>;
  coinId?: string;
}
