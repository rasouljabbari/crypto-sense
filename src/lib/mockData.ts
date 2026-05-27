import { TechnicalIndicators, NewsItem } from "./types";

export function generateTechnicalIndicators(currentPrice: number): TechnicalIndicators {
  return {
    rsi: 40 + Math.random() * 40,
    macd: {
      value: Math.random() * 20 - 10,
      signal: Math.random() * 20 - 10,
      histogram: Math.random() * 4 - 2,
    },
    ema9: currentPrice * (1 + (Math.random() - 0.5) * 0.008),
    ema21: currentPrice * (1 + (Math.random() - 0.5) * 0.015),
    ema50: currentPrice * (1 + (Math.random() - 0.5) * 0.025),
    ema200: currentPrice * (1 + (Math.random() - 0.5) * 0.06),
    bollingerBands: {
      upper: currentPrice * (1 + 0.015 + Math.random() * 0.01),
      middle: currentPrice,
      lower: currentPrice * (1 - 0.015 - Math.random() * 0.01),
    },
    supportLevels: [
      currentPrice * (1 - 0.008 - Math.random() * 0.005),
      currentPrice * (1 - 0.018 - Math.random() * 0.007),
      currentPrice * (1 - 0.032 - Math.random() * 0.01),
    ],
    resistanceLevels: [
      currentPrice * (1 + 0.008 + Math.random() * 0.005),
      currentPrice * (1 + 0.018 + Math.random() * 0.007),
      currentPrice * (1 + 0.032 + Math.random() * 0.01),
    ],
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
