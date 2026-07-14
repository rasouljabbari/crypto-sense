"use client";

import { CoinSearch, type CoinSearchCoin } from "@/components/CoinSearch";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoinAnalysisResult } from "@/features/coin-analysis";
import { useI18n } from "@/i18n/context";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect } from "react";

/* ── Static coin lists (no business logic) ─────────────────────────────── */

const POPULAR_COINS: CoinSearchCoin[] = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "XRP", name: "XRP" },
];

const ALL_COINS: CoinSearchCoin[] = [
  ...POPULAR_COINS,
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "POL", name: "Polygon" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "UNI", name: "Uniswap" },
  { symbol: "ATOM", name: "Cosmos" },
];

/* ── Page (Suspense wrapper required for useSearchParams) ──────────────── */

export default function CoinAnalysisPage() {
  return (
    <Suspense fallback={<DashboardLayout><PageSkeleton /></DashboardLayout>}>
      <CoinAnalysisContent />
    </Suspense>
  );
}

/* ── Inner content ─────────────────────────────────────────────────────── */

function CoinAnalysisContent() {
  const { t } = useI18n();
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const coinId = searchParams.get("coin");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/analysis")}`);
    }
  }, [status, router]);

  const navigateTo = useCallback(
    (symbol: string) => {
      router.push(`/analysis?coin=${encodeURIComponent(symbol)}`, { scroll: false });
    },
    [router],
  );

  const handleSelect = useCallback(
    (coin: CoinSearchCoin) => navigateTo(coin.symbol),
    [navigateTo],
  );

  const handleSearch = useCallback(
    (query: string) => navigateTo(query.trim()),
    [navigateTo],
  );

  if (status !== "authenticated") return null;

  return (
    <DashboardLayout>
      {/* ── Page Title ──────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">
          {t("coin_analysis.title")}
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {t("coin_analysis.subtitle")}
        </p>
      </div>

      {/* ── Coin Search ─────────────────────────────────────── */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 sm:p-8 mb-8">
        <div className="max-w-2xl mx-auto">
          <CoinSearch
            coins={ALL_COINS}
            popularCoins={POPULAR_COINS}
            defaultQuery={coinId ?? ""}
            onSelect={handleSelect}
            onSearch={handleSearch}
          />
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────── */}
      {coinId ? (
        <CoinAnalysisResult key={coinId} coinId={coinId} />
      ) : (
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 64 64" stroke="currentColor" strokeWidth={1}>
              <circle cx="28" cy="28" r="14" strokeOpacity={0.3} />
              <path strokeLinecap="round" d="M38 38l10 10" strokeOpacity={0.4} strokeWidth={1.5} />
              <path strokeLinecap="round" d="M22 24h12M22 32h8" strokeOpacity={0.2} strokeWidth={1} />
            </svg>
          }
          title={t("coin_analysis.empty_title")}
          description={t("coin_analysis.empty_description")}
        />
      )}
    </DashboardLayout>
  );
}

/* ── Shared empty state ────────────────────────────────────────────────── */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl">
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="mb-5 text-gray-600">{icon}</div>
        <h3 className="text-base font-semibold text-gray-300 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 max-w-sm">{description}</p>
      </div>
    </div>
  );
}

/* ── Loading skeleton (while Suspense resolves) ────────────────────────── */

function PageSkeleton() {
  return (
    <>
      <div className="mb-8">
        <div className="h-7 w-40 bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-800 rounded animate-pulse mt-2" />
      </div>
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 sm:p-8 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="h-4 w-32 bg-gray-800 rounded animate-pulse mb-3" />
          <div className="flex gap-3">
            <div className="flex-1 h-12 bg-gray-800 rounded-xl animate-pulse" />
            <div className="w-24 h-12 bg-gray-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </>
  );
}
