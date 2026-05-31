# Position Logic — Long / Short / Neutral

CryptoSense assigns a **LONG**, **SHORT**, or **NEUTRAL** position to every coin using a multi-factor scoring system. The score (0–100) determines both the direction and the conviction level.

---

## 1. Four Sub-Scores

Each sub-score ranges from **0 to 100**. They are calculated independently and then combined.

### Volume Score (25% weight)

Measures trading activity relative to market cap:

| Volume / Market Cap | Score |
|---------------------|-------|
| > 50% | 95 |
| > 30% | 85 |
| > 20% | 75 |
| > 10% | 60 |
| > 5%  | 45 |
| > 2%  | 35 |
| ≤ 2%  | 25 |

High relative volume signals strong market participation, which confirms price moves.

### Trend Score (30% weight)

Starts at **50** and adjusts based on:

- **Price change** (`change% × 2`)
- **RSI zone**: oversold (<30) → +20, overbought (>70) → −20
- **MACD histogram**: positive → +10, negative → −10
- **EMA cross** (9 > 21) → +10, otherwise −10
- **EMA alignment** (21 > 50) → +5, otherwise −5
- **Full EMA alignment** (9 > 21 > 50) → +8 bull / −8 bear
- **Volume confirmation**: if price moves in a direction with vol/mcap > 10%, add ±5

### Technical Score (30% weight)

Continuously maps indicator values to a score:

- **RSI** (primary): linearly mapped — RSI 30 → 80, RSI 50 → 50, RSI 70 → 20
- **MACD histogram magnitude**: `|histogram| / 2` capped at 1, multiplied by ±15
- **EMA full alignment** (9 > 21 > 50): +10 bullish, −10 bearish

### Sentiment Score (15% weight)

Based on mock news relevant to each coin:

- Starts at **50**
- Each positive news item → +10
- Each negative news item → −10
- No relevant news → stays at 50

---

## 2. Final Score

```
overallScore = trend × 0.30 + volume × 0.25 + technical × 0.30 + sentiment × 0.15
```

### Position Threshold

| Score | Position |
|-------|----------|
| ≥ 60  | **LONG** |
| 41–59 | **NEUTRAL** |
| ≤ 40  | **SHORT** |

### Conviction Labels

| Position | Score | Label |
|----------|-------|-------|
| LONG | ≥ 80 | Strong Buy |
| LONG | < 80 | Buy |
| SHORT | ≤ 20 | Strong Short |
| SHORT | > 20 | Short Entry |
| NEUTRAL | ≥ 50 | Hold |
| NEUTRAL | < 50 | Watch |

---

## 3. Quick Estimate (Fallback)

When full analysis data is unavailable (`CoinSearchBox`, `FallbackDetail`), a simplified heuristic is used based only on **24h price change**:

| Change | Position | Score |
|--------|----------|-------|
| > +5%  | LONG | 60 + change × 2 |
| > +2%  | LONG | 55 + change × 2.5 |
| < −5%  | SHORT | 60 + \|change\| × 2 |
| < −2%  | SHORT | 55 + \|change\| × 2.5 |
| +0.5% to +2% | NEUTRAL | 55 |
| −0.5% to −2% | NEUTRAL | 45 |
| −0.5% to +0.5% | NEUTRAL | 50 |

---

## 4. Trend Analysis

Separate from position, short/medium/long-term trend direction is determined purely from price change:

| Period | Threshold | Direction |
|--------|-----------|-----------|
| Short-term | ≥ +2% / ≤ −2% | Bullish / Bearish |
| Medium-term | ≥ +5% / ≤ −5% | Bullish / Bearish |
| Long-term | ≥ +10% / ≤ −10% | Bullish / Bearish |

---

## 5. Risk Allocation

Risk allocation estimates position sizing (0.25–1.00) based on:

- **Trend alignment**: position matches short-term trend → +30, neutral → +15
- **Overall score**: contributes up to +25
- **RSI confirmation**: for LONG positions, RSI < 30 → +25, RSI < 50 → +20, RSI < 70 → +10; for SHORT, the inverse
- **Thresholds**: ≥85 → 1.00, ≥65 → 0.75, ≥40 → 0.50, <40 → 0.25
