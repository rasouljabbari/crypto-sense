// ---------------------------------------------------------------------------
// Fear & Greed Repository
// Data source: /api/fear-greed (Next.js proxy → CoinMarketCap)
// ---------------------------------------------------------------------------

import { HttpClient, type RequestOptions } from "../http";

// ─── DTOs (CoinMarketCap wire format) ─────────────────────────────────────

interface CmcFearGreedResponse {
  readonly data: CmcFearGreedData;
}

interface CmcFearGreedData {
  readonly historicalValues: CmcHistoricalValues;
}

interface CmcHistoricalValues {
  readonly now: CmcFearGreedItem;
  readonly yesterday?: CmcFearGreedItem;
  readonly historical?: readonly CmcFearGreedItem[];
}

interface CmcFearGreedItem {
  readonly score: number;
  readonly name: string;
}

// ─── Public DTO ───────────────────────────────────────────────────────────

export interface FearGreedSnapshot {
  readonly score: number;
  readonly classification: string;
}

export interface FearGreedHistoryPoint {
  readonly score: number;
  readonly classification: string;
  readonly timestamp: number;
}

export interface FearGreedResult {
  readonly now: FearGreedSnapshot;
  readonly previous: FearGreedSnapshot | null;
  readonly history: readonly FearGreedHistoryPoint[];
}

// ─── Repository ───────────────────────────────────────────────────────────

export class FearGreedRepository {
  private readonly api: HttpClient;

  constructor() {
    this.api = new HttpClient({
      timeout: 10_000,
      retryCount: 1,
      retryBaseDelayMs: 300,
    });
  }

  async getFearGreed(
    start?: number,
    end?: number,
    options?: RequestOptions,
  ): Promise<FearGreedResult> {
    const params = new URLSearchParams();
    if (start !== undefined) params.set("start", String(start));
    if (end !== undefined) params.set("end", String(end));

    const query = params.toString();
    const path = query.length > 0 ? `/api/fear-greed?${query}` : "/api/fear-greed";

    const raw = await this.api.get<CmcFearGreedResponse>(path, options);
    const h = raw.data.historicalValues;

    const now: FearGreedSnapshot = {
      score: h.now.score,
      classification: h.now.name,
    };

    const previous: FearGreedSnapshot | null =
      h.yesterday !== undefined
        ? { score: h.yesterday.score, classification: h.yesterday.name }
        : null;

    let history: readonly FearGreedHistoryPoint[] = [];
    if (h.historical !== undefined && Array.isArray(h.historical)) {
      history = h.historical.map((item, index) => ({
        score: item.score,
        classification: item.name,
        timestamp: end !== undefined
          ? end - (h.historical!.length - 1 - index) * 86400
          : Math.floor(Date.now() / 1000) - (h.historical!.length - 1 - index) * 86400,
      }));
    }

    return { now, previous, history };
  }
}
