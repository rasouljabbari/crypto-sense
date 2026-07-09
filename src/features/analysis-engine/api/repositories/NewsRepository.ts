// ---------------------------------------------------------------------------
// News Repository
// Data source: /api/news (Next.js proxy — to be implemented server-side)
// ---------------------------------------------------------------------------

import { HttpClient, type RequestOptions } from "../http";
import type { NewsArticle, ArticleSentiment } from "../../types";

// ─── DTOs ─────────────────────────────────────────────────────────────────

interface NewsApiResponse {
  readonly articles: readonly NewsApiArticleDTO[];
}

interface NewsApiArticleDTO {
  readonly id: string;
  readonly title: string;
  readonly source: string;
  readonly url: string;
  readonly publishedAt: string;
  readonly sentiment: ArticleSentiment;
  readonly relatedCoins: readonly string[];
  readonly summary: string;
}

// ─── Repository ───────────────────────────────────────────────────────────

export class NewsRepository {
  private readonly api: HttpClient;

  constructor() {
    this.api = new HttpClient({
      timeout: 10_000,
      retryCount: 1,
      retryBaseDelayMs: 300,
    });
  }

  // ─── All news ──────────────────────────────────────────────────────

  async getNews(options?: RequestOptions): Promise<readonly NewsArticle[]> {
    const raw = await this.api.get<NewsApiResponse>("/api/news", options);
    return raw.articles.map(this.toDomain);
  }

  // ─── News for a specific coin ──────────────────────────────────────

  async getNewsForCoin(
    coinId: string,
    options?: RequestOptions,
  ): Promise<readonly NewsArticle[]> {
    const raw = await this.api.get<NewsApiResponse>(
      `/api/news?coinId=${encodeURIComponent(coinId)}`,
      options,
    );
    return raw.articles.map(this.toDomain);
  }

  // ─── Mapping ───────────────────────────────────────────────────────

  private toDomain(dto: NewsApiArticleDTO): NewsArticle {
    return {
      id: dto.id,
      title: dto.title,
      source: dto.source,
      url: dto.url,
      publishedAt: dto.publishedAt,
      sentiment: dto.sentiment,
      relatedCoins: dto.relatedCoins,
      summary: dto.summary,
    };
  }
}
