export const FEATURED_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "LINKUSDT",
] as const;

export type FeaturedSymbol = (typeof FEATURED_SYMBOLS)[number];
