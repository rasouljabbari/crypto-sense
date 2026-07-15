import { MarketData, CoinAnalysis } from "./types";
import { analyzeAllCoins } from "./analysisEngine";
import { fetchMarketDataList } from "@/api/binance";

export interface RankingResult {
  rankedCoins: CoinAnalysis[];
  generatedAt: string;
  totalAnalyzed: number;
}

export function rankCoins(marketDataList: MarketData[]): RankingResult {
  const analyzed = analyzeAllCoins(marketDataList);
  const ranked = [...analyzed].sort((a, b) => b.overallScore - a.overallScore);

  return {
    rankedCoins: ranked,
    generatedAt: new Date().toISOString(),
    totalAnalyzed: ranked.length,
  };
}

export async function fetchAndRankCoins(): Promise<RankingResult> {
  const marketData = await fetchMarketDataList();
  return rankCoins(marketData);
}
