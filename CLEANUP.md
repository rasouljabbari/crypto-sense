# Landing Page Cleanup Report

## Removed Files

| File | Reason |
|------|--------|
| `src/app/page.tsx` | Replaced by `src/app/(landing)/page.tsx` with real market data |
| `src/app/api/scanner/route.ts` | Landing no longer uses REST polling — replaced by live WebSocket via `useBinanceMarket` hook |

## Removed Dependencies

### Setup Engine — never imported by landing
- `indicator-engine/setup-engine/engine.ts` (evaluateSetup)
- `@/lib/analysisEngine` (analyzeCoin, analyzeAllCoins)

### Alert/Notification System — removed from landing layout
- `src/components/OpportunityToast.tsx` (ToastContainer)
- `src/components/OpportunityToast.tsx` (useOpportunityWatcher)

### Analysis Infrastructure — removed from landing layout
- `src/components/AnalysisProvider.tsx` (TimeframeLoop, IndicatorsLoop)
- `src/lib/countdown-context.tsx` (CountdownProviderWithRefresh)
- `src/lib/timeframe.tsx` (TimeframeProvider)
- `src/store/useAnalysisSnapshot.ts` (useSnapshotStore)

## Removed Mock/Hardcoded Data

- `SCAN_DATA` — hardcoded scan results array
- `COIN_SYMBOLS` — hardcoded coin symbol list (replaced by `FEATURED_SYMBOLS` from config)
- `mulberry32()` — seeded PRNG for deterministic SSR candles
- `seedCandle()` — mock candle generator
- `nextCandle()` — random-walk candle updater
- `generateCandles()` — mock chart data generator
- `CandlestickChartSVG` — mock candlestick SVG (replaced by `ScannerChart` with real data)

## Removed Engine Concepts From Landing

Landing no longer computes or displays:
- **Opportunity** — no opportunity detection
- **Ready Long / Ready Short** — no trade signals
- **Watch / No Trade** — no setup status
- **Momentum Score** — not calculated
- **Risk Score** — not calculated
- **Quality Score** — not calculated
- **Confidence Score** — not calculated
- **Trade Setup** — not evaluated
- **Signal (LONG/SHORT/NEUTRAL)** — not determined

## Architecture Changes

### Route Groups
- `src/app/(landing)/` — Landing has its own route group with NO analysis providers
- `src/app/(app)/` — App pages use a separate layout with full analysis stack

### Root Layout (`src/app/layout.tsx`)
- Kept: `QueryProvider`, `ThemeProvider`, `I18nProvider`, `SessionProvider`
- Removed: `TimeframeProvider`, `AnalysisProvider`, `CountdownProviderWithRefresh`, `ToastContainer`

### App Layout (`src/app/(app)/layout.tsx`)
- Contains: `TimeframeProvider`, `AnalysisProvider`, `CountdownProviderWithRefresh`, `ToastContainer`
- Only applies to pages in `(app)/` route group (analysis, coins, watchlist, login, register)

### Landing Layout (`src/app/(landing)/layout.tsx`)
- Empty — no providers beyond root
- Only renders children

### Moved Pages to `(app)/` route group
- `src/app/analysis/` → `src/app/(app)/analysis/`
- `src/app/coins/` → `src/app/(app)/coins/`
- `src/app/watchlist/` → `src/app/(app)/watchlist/`
- `src/app/login/` → `src/app/(app)/login/`
- `src/app/register/` → `src/app/(app)/register/`

## New/Modified Files

### New
- `src/app/(landing)/layout.tsx` — empty landing layout
- `src/app/(landing)/page.tsx` — landing page with real market data
- `src/app/(app)/layout.tsx` — app providers layout
- `CLEANUP.md` — this file

### Modified
- `src/app/layout.tsx` — removed heavy providers
- `src/services/binance-market.ts` — added `fetchKlines()` and `MarketCandle` export
- `src/i18n/dictionaries/en.json` — added `landing.ticker.loading` key
- `src/i18n/dictionaries/tr.json` — added `landing.ticker.loading` translation
- `src/i18n/dictionaries/fa.json` — added `landing.ticker.loading` translation

### Deleted
- `src/app/page.tsx` — old landing with mock data
- `src/app/api/scanner/route.ts` — unused scanner API

## What Landing Still Uses

### Real Market Data
- `useBinanceMarket` hook — real-time WebSocket ticker data
- `binanceService.fetchKlines()` — REST kline data for candlestick charts
- `FEATURED_SYMBOLS` from `src/config/featured-coins.ts`
- Framer Motion for animations
- i18n for all labels (en/fa/tr)
- Theme context for dark/light mode

### Visual Elements Kept
- Hero section with animated candlestick chart (now real data)
- Scanner beam animation
- How It Works section
- Live Preview (now uses MarketTicker with real data)
- Features grid
- Contact form
- Footer
- Language switcher
- Theme toggle
