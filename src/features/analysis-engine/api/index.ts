// ---------------------------------------------------------------------------
// API Layer — Public Interface
// ---------------------------------------------------------------------------

export { HttpClient } from "./http";
export type { RequestOptions, HttpClientConfig } from "./http";

export {
  ApiError,
  NetworkError,
  TimeoutError,
  HttpError,
  RetryError,
  InvalidResponseError,
} from "./errors";

export { MarketRepository } from "./repositories/MarketRepository";
export type { GlobalMarketSnapshot } from "./repositories/MarketRepository";
export type { MarketData, OHLCV } from "../types";

export { NewsRepository } from "./repositories/NewsRepository";

export { FearGreedRepository } from "./repositories/FearGreedRepository";
export type {
  FearGreedSnapshot,
  FearGreedHistoryPoint,
  FearGreedResult,
} from "./repositories/FearGreedRepository";

export { CoinMetadataRepository } from "./repositories/CoinMetadataRepository";
export type {
  CoinMetadata as CoinMetadataDTO,
  CoinSearchResult,
} from "./repositories/CoinMetadataRepository";
