import { MarketData, TechnicalIndicators, TrendAnalysis, SentimentData, NewsItem, CoinAnalysis, PositionType } from "./types";
import { generateTechnicalIndicators, MOCK_NEWS } from "./mockData";

function calculateVolumeScore(volume24h: number, marketCap: number): number {
  const ratio = volume24h / marketCap;
  if (ratio > 0.3) return 95;
  if (ratio > 0.2) return 85;
  if (ratio > 0.15) return 75;
  if (ratio > 0.1) return 60;
  if (ratio > 0.05) return 45;
  return 30;
}

function calculateTrendScore(priceChange: number, indicators: TechnicalIndicators): number {
  let score = 50;
  score += priceChange * 2;

  const { rsi, macd } = indicators;
  if (rsi < 30) score += 20;
  else if (rsi < 40) score += 10;
  else if (rsi > 70) score -= 20;
  else if (rsi > 60) score -= 10;

  if (macd.histogram > 0) score += 10;
  else score -= 10;

  if (indicators.ema9 > indicators.ema21) score += 10;
  else score -= 10;

  if (indicators.ema21 > indicators.ema50) score += 5;
  else score -= 5;

  return Math.max(0, Math.min(100, score));
}

function calculateSentimentScore(news: NewsItem[], coinId: string): number {
  const relevantNews = news.filter(n => n.relatedCoins.includes(coinId));
  if (relevantNews.length === 0) return 50;

  let score = 50;
  for (const n of relevantNews) {
    if (n.sentiment === "positive") score += 10;
    else if (n.sentiment === "negative") score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

function determinePosition(
  trendScore: number,
  volumeScore: number,
  sentimentScore: number,
  technicalScore: number
): { position: PositionType; overallScore: number } {
  const overallScore = Math.round(
    trendScore * 0.25 + volumeScore * 0.35 + sentimentScore * 0.2 + technicalScore * 0.2
  );

  let position: PositionType;
  if (overallScore >= 60) position = "long";
  else if (overallScore <= 40) position = "short";
  else position = "neutral";

  return { position, overallScore };
}

function generateTrendAnalysis(priceChangePercent: number): TrendAnalysis {
  const shortTerm = priceChangePercent > 2 ? "bullish" : priceChangePercent < -2 ? "bearish" : "neutral";
  const mediumTerm = priceChangePercent > 5 ? "bullish" : priceChangePercent < -5 ? "bearish" : "neutral";
  const longTerm = priceChangePercent > 10 ? "bullish" : priceChangePercent < -10 ? "bearish" : "neutral";

  const score = priceChangePercent > 0
    ? 50 + Math.min(priceChangePercent * 3, 50)
    : 50 + Math.max(priceChangePercent * 3, -50);

  return { shortTerm, mediumTerm, longTerm, score: Math.round(score) };
}

export function analyzeCoin(marketData: MarketData): CoinAnalysis {
  const indicators = generateTechnicalIndicators(marketData);

  const volumeScore = calculateVolumeScore(marketData.volume24h, marketData.marketCap);
  const trendScore = calculateTrendScore(marketData.priceChangePercent24h, indicators);
  const sentimentScore = calculateSentimentScore(MOCK_NEWS, marketData.id);

  const technicalScore = (() => {
    const rsiScore = indicators.rsi < 30 ? 80 : indicators.rsi > 70 ? 20 : 50;
    const macdScore = indicators.macd.histogram > 0 ? 70 : 30;
    const emaScore = indicators.ema9 > indicators.ema21 ? 70 : 30;
    return Math.round((rsiScore + macdScore + emaScore) / 3);
  })();

  const { position, overallScore } = determinePosition(trendScore, volumeScore, sentimentScore, technicalScore);
  const trendAnalysis = generateTrendAnalysis(marketData.priceChangePercent24h);

  const coinNews = MOCK_NEWS.filter(n => n.relatedCoins.includes(marketData.id));
  const sentiment: SentimentData = {
    overall: sentimentScore > 60 ? "positive" : sentimentScore < 40 ? "negative" : "neutral",
    score: sentimentScore,
    twitterMentions: Math.floor(Math.random() * 50000) + 5000,
    positiveRatio: sentimentScore / 100,
    newsCount: coinNews.length,
    recentNews: coinNews,
  };

  return {
    coinId: marketData.id,
    position,
    overallScore,
    volumeScore,
    trendScore,
    sentimentScore,
    technicalScore,
    marketData,
    technicalIndicators: indicators,
    trendAnalysis,
    sentiment,
    lastUpdated: new Date().toISOString(),
  };
}

export function analyzeAllCoins(marketDataList: MarketData[]): CoinAnalysis[] {
  return marketDataList.map(analyzeCoin);
}
