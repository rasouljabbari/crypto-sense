// ---------------------------------------------------------------------------
// News Engine
//
// Collects, deduplicates, ranks, groups, and normalizes news articles.
// All processing functions are pure and deterministic.
// ---------------------------------------------------------------------------

import { NewsRepository, type RequestOptions } from "../../api";
import type { ArticleSentiment, NewsArticle } from "../../types";

import type {
  NormalizedArticle,
  NewsGroup,
  NewsEngineInput,
  NewsEngineOutput,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// Defaults
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SOURCE_AUTHORITY: Readonly<Record<string, number>> = {
  coinDesk: 1.0,
  coinTelegraph: 1.0,
  theBlock: 0.95,
  decrypt: 0.85,
  uToday: 0.80,
  cointelegraph: 1.0,
  coindesk: 1.0,
  forbes: 0.90,
  reuters: 0.95,
  bloomberg: 0.95,
} as const;

const DEFAULT_DEDUP_THRESHOLD = 0.55;
const DEFAULT_GROUP_THRESHOLD = 0.35;

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function clamp(n: number, min: number = 0, max: number = 100): number {
  return Math.round(Math.max(min, Math.min(max, n)));
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Jaccard Similarity
// ═══════════════════════════════════════════════════════════════════════════
//
// Intersection over union of word tokens.
// Score: 0 (no overlap) to 1 (identical).
// ═══════════════════════════════════════════════════════════════════════════

export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return intersection / union;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Deduplication
// ═══════════════════════════════════════════════════════════════════════════
//
// Articles are considered duplicates when their title Jaccard similarity
// exceeds `threshold`.  When two articles match, the one with the longer
// summary is kept (more informative).
// ═══════════════════════════════════════════════════════════════════════════

export function deduplicate(
  articles: readonly NewsArticle[],
  threshold: number = DEFAULT_DEDUP_THRESHOLD,
): readonly NewsArticle[] {
  if (articles.length <= 1) return articles;

  const kept: NewsArticle[] = [];
  const removed = new Set<string>();

  for (const article of articles) {
    if (removed.has(article.id)) continue;

    let best = article;

    for (const other of articles) {
      if (other.id === best.id || removed.has(other.id)) continue;

      const sim = jaccardSimilarity(best.title, other.title);
      if (sim >= threshold) {
        // Keep the one with the longer summary
        best = best.summary.length >= other.summary.length ? best : other;
        removed.add(other.id);
      }
    }

    kept.push(best);
  }

  return kept;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Importance Ranking
// ═══════════════════════════════════════════════════════════════════════════
//
// Each article gets a 0-100 importance score based on:
//
//   Recency (0-40):
//     Relative to the newest article in the batch.
//     Score = 40 × max(0, 1 - ageHours / 72)
//     Age is measured from the latest article's timestamp.
//
//   Source authority (0-25):
//     Mapped from DEFAULT_SOURCE_AUTHORITY.
//     Unknown sources get 0.3.
//
//   Coin relevance (0-20):
//     5 points per related coin, capped at 20.
//
//   Sentiment extremity (0-10):
//     Positive or negative → 10. Neutral → 0.
//
//   Summary length (0-5):
//     Score = min(5, summary.length / 100)
// ═══════════════════════════════════════════════════════════════════════════

export function rankArticles(
  articles: readonly NewsArticle[],
  authority?: Readonly<Record<string, number>>,
): readonly NormalizedArticle[] {
  const authorityMap = authority ?? DEFAULT_SOURCE_AUTHORITY;

  // Latest timestamp in the batch — makes ranking relative and deterministic
  const timestamps = articles.map((a) => new Date(a.publishedAt).getTime());
  const maxTime = Math.max(...timestamps);

  return articles.map((a) => {
    const ageMs = maxTime - new Date(a.publishedAt).getTime();
    const ageHours = ageMs / 3_600_000;

    const recency = clamp(40 * Math.max(0, 1 - ageHours / 72), 0, 40);
    const source = clamp((authorityMap[a.source.toLowerCase()] ?? 0.3) * 25, 0, 25);
    const coinRel = clamp(a.relatedCoins.length * 5, 0, 20);
    const sentExtreme = a.sentiment === "neutral" ? 0 : 10;
    const lengthScore = clamp(a.summary.length / 20, 0, 5);

    const importanceScore = clamp(recency + source + coinRel + sentExtreme + lengthScore);

    return {
      id: a.id,
      title: a.title,
      source: a.source,
      url: a.url,
      publishedAt: a.publishedAt,
      sentiment: a.sentiment,
      summary: a.summary,
      relatedCoins: a.relatedCoins,
      importanceScore,
      ageHours: Math.round(ageHours * 10) / 10,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Grouping
// ═══════════════════════════════════════════════════════════════════════════
//
// Groups similar articles using connected components on a similarity graph.
//
// Similarity between two articles is a weighted combination:
//
//   Title Jaccard (50%)
//   Related coin overlap (30%)
//   Source match (20%)
//
// Two articles are connected when similarity ≥ `threshold`.
// Each connected component becomes a NewsGroup.
// The highest-importance article is the representative.
// ═══════════════════════════════════════════════════════════════════════════

function articleSimilarity(a: NormalizedArticle, b: NormalizedArticle): number {
  const titleSim = jaccardSimilarity(a.title, b.title) * 0.50;

  // Coin overlap (Jaccard on related coins)
  const coinA = new Set(a.relatedCoins.map((c) => c.toLowerCase()));
  const coinB = new Set(b.relatedCoins.map((c) => c.toLowerCase()));
  let coinInter = 0;
  for (const c of coinA) {
    if (coinB.has(c)) coinInter++;
  }
  const coinUnion = coinA.size + coinB.size - coinInter;
  const coinSim = coinUnion > 0 ? (coinInter / coinUnion) * 0.30 : 0;

  // Source match
  const srcSim = a.source.toLowerCase() === b.source.toLowerCase() ? 0.20 : 0;

  return titleSim + coinSim + srcSim;
}

export function groupArticles(
  articles: readonly NormalizedArticle[],
  threshold: number = DEFAULT_GROUP_THRESHOLD,
): readonly NewsGroup[] {
  if (articles.length === 0) return [];

  const n = articles.length;
  const visited = new Array<boolean>(n).fill(false);
  const groups: NewsGroup[] = [];

  // Build adjacency list
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = articleSimilarity(articles[i], articles[j]);
      if (sim >= threshold) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  // DFS to find connected components
  function dfs(start: number, component: number[]): void {
    visited[start] = true;
    component.push(start);
    for (const neighbor of adj[start]) {
      if (!visited[neighbor]) dfs(neighbor, component);
    }
  }

  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      const component: number[] = [];
      dfs(i, component);

      const grouped = component.map((idx) => articles[idx]);
      const sorted = [...grouped].sort(
        (a, b) => b.importanceScore - a.importanceScore,
      );
      const representative = sorted[0];

      const avgImp =
        grouped.reduce((s, a) => s + a.importanceScore, 0) / grouped.length;

      // Dominant sentiment
      const counts: Record<string, number> = {
        positive: 0,
        negative: 0,
        neutral: 0,
      };
      for (const a of grouped) counts[a.sentiment]++;
      const domSent = (Object.entries(counts).sort(
        (a, b) => b[1] - a[1],
      )[0][0] ?? "neutral") as ArticleSentiment;

      // Merged related coins (unique, sorted)
      const allCoins = new Set(grouped.flatMap((a) => a.relatedCoins));

      groups.push({
        id: `group_${groups.length + 1}`,
        representativeTitle: representative.title,
        representativeSource: representative.source,
        articles: grouped,
        articleCount: grouped.length,
        averageImportance: Math.round(avgImp),
        dominantSentiment: domSent,
        relatedCoins: [...allCoins].sort(),
      });
    }
  }

  return groups.sort((a, b) => b.averageImportance - a.averageImportance);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Orchestrator
// ═══════════════════════════════════════════════════════════════════════════

export function processNews(input: NewsEngineInput): NewsEngineOutput {
  const threshold = input.dedupThreshold ?? DEFAULT_DEDUP_THRESHOLD;

  const unique = deduplicate(input.rawArticles, threshold);
  const ranked = rankArticles(unique, input.sourceAuthority);
  const groups = groupArticles(ranked, input.groupThreshold ?? DEFAULT_GROUP_THRESHOLD);

  return {
    articles: ranked,
    groups,
    totalRaw: input.rawArticles.length,
    uniqueCount: ranked.length,
    duplicateRemoved: input.rawArticles.length - ranked.length,
    groupsCount: groups.length,
    fetchedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// NewsEngine Class
// ═══════════════════════════════════════════════════════════════════════════

export class NewsEngine {
  private readonly repository: NewsRepository;

  constructor() {
    this.repository = new NewsRepository();
  }

  async getNews(options?: RequestOptions): Promise<readonly NewsArticle[]> {
    return this.repository.getNews(options);
  }

  async getNewsForCoin(
    coinId: string,
    options?: RequestOptions,
  ): Promise<readonly NewsArticle[]> {
    return this.repository.getNewsForCoin(coinId, options);
  }

  async analyze(
    input: NewsEngineInput,
  ): Promise<NewsEngineOutput> {
    return processNews(input);
  }

  async analyzeForCoin(
    coinId: string,
    options?: RequestOptions & {
      sourceAuthority?: Readonly<Record<string, number>>;
      dedupThreshold?: number;
      groupThreshold?: number;
    },
  ): Promise<NewsEngineOutput> {
    const raw = await this.getNewsForCoin(coinId, options);
    return processNews({
      rawArticles: raw,
      sourceAuthority: options?.sourceAuthority,
      dedupThreshold: options?.dedupThreshold,
      groupThreshold: options?.groupThreshold,
    });
  }
}
