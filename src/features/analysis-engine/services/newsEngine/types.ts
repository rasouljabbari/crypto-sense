// ---------------------------------------------------------------------------
// News Engine — Types
// ---------------------------------------------------------------------------

import type { ArticleSentiment, NewsArticle } from "../../types";

// ─── Normalized Article ───────────────────────────────────────────────────

export interface NormalizedArticle {
  readonly id: string;
  readonly title: string;
  readonly source: string;
  readonly url: string;
  readonly publishedAt: string;
  readonly sentiment: ArticleSentiment;
  readonly summary: string;
  readonly relatedCoins: readonly string[];
  readonly importanceScore: number;
  readonly ageHours: number;
}

// ─── Grouped News ─────────────────────────────────────────────────────────

export interface NewsGroup {
  readonly id: string;
  readonly representativeTitle: string;
  readonly representativeSource: string;
  readonly articles: readonly NormalizedArticle[];
  readonly articleCount: number;
  readonly averageImportance: number;
  readonly dominantSentiment: ArticleSentiment;
  readonly relatedCoins: readonly string[];
}

// ─── Engine Input ─────────────────────────────────────────────────────────

export interface NewsEngineInput {
  readonly rawArticles: readonly NewsArticle[];
  readonly sourceAuthority?: Readonly<Record<string, number>>;
  readonly dedupThreshold?: number;
  readonly groupThreshold?: number;
}

// ─── Engine Output ────────────────────────────────────────────────────────

export interface NewsEngineOutput {
  readonly articles: readonly NormalizedArticle[];
  readonly groups: readonly NewsGroup[];
  readonly totalRaw: number;
  readonly uniqueCount: number;
  readonly duplicateRemoved: number;
  readonly groupsCount: number;
  readonly fetchedAt: string;
}
