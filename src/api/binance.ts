import { ChartDataPoint, MarketData, MarketIndicators } from "@/lib/types";

const BINANCE_REST = "https://api.binance.com/api/v3";

export interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  count: number;
}

const FUTURES_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "TRXUSDT", "LINKUSDT", "AVAXUSDT",
  "DOTUSDT", "LTCUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "XLMUSDT", "FILUSDT", "ICPUSDT", "APTUSDT", "NEARUSDT",
  "ARBUSDT", "OPUSDT", "INJUSDT", "TIAUSDT", "SEIUSDT", "SUIUSDT", "WLDUSDT", "TAOUSDT", "AAVEUSDT", "UNIUSDT",
  "MKRUSDT", "RENDERUSDT", "FETUSDT", "ENAUSDT", "ONDOUSDT", "JUPUSDT", "PYTHUSDT", "BONKUSDT", "FLOKIUSDT",
  "SHIBUSDT", "THETAUSDT", "GRTUSDT", "SANDUSDT", "MANAUSDT", "AXSUSDT", "CHZUSDT", "FLOWUSDT", "EGLDUSDT", "ALGOUSDT",
  "VETUSDT", "HBARUSDT", "TONUSDT", "QNTUSDT", "XTZUSDT", "EOSUSDT", "NEOUSDT", "KAVAUSDT", "ZECUSDT", "IOTAUSDT",
  "COMPUSDT", "SNXUSDT", "1INCHUSDT", "DYDXUSDT", "LDOUSDT", "STRKUSDT", "CFXUSDT", "ROSEUSDT", "MEMEUSDT", "WIFUSDT",
  "JASMYUSDT", "RAYUSDT", "CAKEUSDT", "GALAUSDT", "BEAMUSDT", "ORDIUSDT", "ETHFIUSDT", "PENDLEUSDT", "NOTUSDT", "ZKUSDT",
  "SUPERUSDT", "TWTUSDT", "HOTUSDT", "ANKRUSDT", "WOOUSDT", "RVNUSDT", "LRCUSDT", "BANDUSDT", "SFPUSDT", "SKLUSDT",
  "OCEANUSDT", "CELOUSDT", "ICXUSDT", "ZENUSDT", "STXUSDT", "ARKMUSDT", "BLURUSDT", "GMXUSDT", "ZRXUSDT", "POLUSDT"
];

const ID_OVERRIDES: Record<string, string> = {
  BTCUSDT: "bitcoin", ETHUSDT: "ethereum", BNBUSDT: "binancecoin", SOLUSDT: "solana",
  XRPUSDT: "ripple", DOGEUSDT: "dogecoin", ADAUSDT: "cardano", LINKUSDT: "chainlink",
  AVAXUSDT: "avalanche", DOTUSDT: "polkadot", LTCUSDT: "litecoin", BCHUSDT: "bitcoin-cash",
  ATOMUSDT: "cosmos", XLMUSDT: "stellar", APTUSDT: "aptos", ARBUSDT: "arbitrum",
  NEARUSDT: "near-protocol", TONUSDT: "toncoin",
};

export const COIN_SYMBOL_MAP: Record<string, string> = {};
const SYMBOL_TO_ID: Record<string, string> = {};
for (const sym of FUTURES_SYMBOLS) {
  const id = ID_OVERRIDES[sym] ?? `coin-${sym.replace("USDT", "").toLowerCase()}`;
  COIN_SYMBOL_MAP[id] = sym;
  SYMBOL_TO_ID[sym] = id;
}

export const ALL_BINANCE_SYMBOLS = FUTURES_SYMBOLS;

const KWN_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", BNB: "BNB", SOL: "Solana", XRP: "XRP",
  DOGE: "Dogecoin", ADA: "Cardano", TRX: "TRON", LINK: "Chainlink", AVAX: "Avalanche",
  DOT: "Polkadot", LTC: "Litecoin", BCH: "Bitcoin Cash", ATOM: "Cosmos", ETC: "Ethereum Classic",
  XLM: "Stellar", FIL: "Filecoin", ICP: "Internet Computer", APT: "Aptos", NEAR: "NEAR Protocol",
  ARB: "Arbitrum", OP: "Optimism", INJ: "Injective", TIA: "Celestia", SEI: "Sei",
  SUI: "Sui", WLD: "Worldcoin", TAO: "Bittensor", AAVE: "Aave", UNI: "Uniswap",
  MKR: "Maker", RENDER: "Render", FET: "Fetch.ai", ENA: "Ethena", ONDO: "Ondo",
  JUP: "Jupiter", PYTH: "Pyth Network", BONK: "Bonk", FLOKI: "Floki",
  SHIB: "Shiba Inu", THETA: "Theta Network", GRT: "The Graph", SAND: "The Sandbox",
  MANA: "Decentraland", AXS: "Axie Infinity", CHZ: "Chiliz", FLOW: "Flow",
  EGLD: "MultiversX", ALGO: "Algorand", VET: "VeChain", KAS: "Kaspa", CRO: "Cronos",
  QNT: "Quant", XTZ: "Tezos", EOS: "EOS", NEO: "Neo", KAVA: "Kava",
  ZEC: "Zcash", IOTA: "IOTA", COMP: "Compound", SNX: "Synthetix", "1INCH": "1inch",
  DYDX: "dYdX", LDO: "Lido DAO", STRK: "StarkNet", CFX: "Conflux", ROSE: "Oasis Network",
  CORE: "Core DAO", WIF: "dogwifhat", JASMY: "JasmyCoin", RAY: "Raydium", AKT: "Akash Network",
  GALA: "Gala", BEAM: "Beam", ORDI: "ORDI", ETHFI: "Ether.fi", PENDLE: "Pendle",
  NOT: "Notcoin", ZK: "zkSync", SUPER: "SuperVerse", TWT: "Trust Wallet", HOT: "Holo",
  ANKR: "Ankr", WOO: "WOO Network", RVN: "Ravencoin", LRC: "Loopring", BAND: "Band Protocol",
  SFP: "SafePal", SKL: "SKALE", OCEAN: "Ocean Protocol", CELO: "Celo", ICX: "ICON",
  ZEN: "Horizen", STX: "Stacks", ARKM: "Arkham", BLUR: "Blur", GMX: "GMX", ZRX: "0x",
  HBAR: "Hedera", TON: "Toncoin", CAKE: "PancakeSwap", MEME: "Memecoin", POL: "Polygon",
};

export const STATIC_COIN_DATA: Record<string, Omit<MarketData, "currentPrice" | "marketCap" | "volume24h" | "priceChange24h" | "priceChangePercent24h" | "high24h" | "low24h">> = {
  bitcoin: { id: "bitcoin", rank: 1, symbol: "BTC", name: "Bitcoin", image: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg", circulatingSupply: 19700000, totalSupply: 21000000, ath: 73750, athDate: "2024-03-14", atl: 67.81, atlDate: "2013-07-06" },
  ethereum: { id: "ethereum", rank: 2, symbol: "ETH", name: "Ethereum", image: "https://cryptologos.cc/logos/ethereum-eth-logo.svg", circulatingSupply: 120200000, totalSupply: null, ath: 4878, athDate: "2021-11-10", atl: 0.433, atlDate: "2015-10-20" },
  solana: { id: "solana", rank: 5, symbol: "SOL", name: "Solana", image: "https://cryptologos.cc/logos/solana-sol-logo.svg", circulatingSupply: 463800000, totalSupply: 583900000, ath: 259.96, athDate: "2021-11-07", atl: 0.503, atlDate: "2020-05-11" },
  ripple: { id: "ripple", rank: 7, symbol: "XRP", name: "XRP", image: "https://cryptologos.cc/logos/xrp-xrp-logo.svg", circulatingSupply: 55200000000, totalSupply: 100000000000, ath: 3.84, athDate: "2018-01-07", atl: 0.00282, atlDate: "2014-05-22" },
  cardano: { id: "cardano", rank: 8, symbol: "ADA", name: "Cardano", image: "https://cryptologos.cc/logos/cardano-ada-logo.svg", circulatingSupply: 35400000000, totalSupply: 45000000000, ath: 3.10, athDate: "2021-09-02", atl: 0.01925, atlDate: "2020-03-13" },
  avalanche: { id: "avalanche", rank: 12, symbol: "AVAX", name: "Avalanche", image: "https://cryptologos.cc/logos/avalanche-avax-logo.svg", circulatingSupply: 394000000, totalSupply: 450000000, ath: 144.96, athDate: "2021-11-07", atl: 2.80, atlDate: "2020-12-31" },
  chainlink: { id: "chainlink", rank: 14, symbol: "LINK", name: "Chainlink", image: "https://cryptologos.cc/logos/chainlink-link-logo.svg", circulatingSupply: 587000000, totalSupply: 1000000000, ath: 52.88, athDate: "2021-05-10", atl: 0.1947, atlDate: "2019-01-05" },
  polkadot: { id: "polkadot", rank: 15, symbol: "DOT", name: "Polkadot", image: "https://cryptologos.cc/logos/polkadot-new-dot-logo.svg", circulatingSupply: 1428000000, totalSupply: null, ath: 54.98, athDate: "2021-11-04", atl: 2.70, atlDate: "2020-08-20" },
  "near-protocol": { id: "near-protocol", rank: 19, symbol: "NEAR", name: "NEAR Protocol", image: "https://cryptologos.cc/logos/near-protocol-near-logo.svg", circulatingSupply: 1090000000, totalSupply: null, ath: 20.44, athDate: "2022-01-16", atl: 0.527, atlDate: "2021-11-04" },
  dogecoin: { id: "dogecoin", rank: 9, symbol: "DOGE", name: "Dogecoin", image: "https://cryptologos.cc/logos/dogecoin-doge-logo.svg", circulatingSupply: 144700000000, totalSupply: null, ath: 0.7316, athDate: "2021-05-08", atl: 0.000085, atlDate: "2015-05-06" },
  litecoin: { id: "litecoin", rank: 18, symbol: "LTC", name: "Litecoin", image: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg", circulatingSupply: 75000000, totalSupply: 84000000, ath: 410.26, athDate: "2021-05-10", atl: 1.15, atlDate: "2015-01-14" },
  stellar: { id: "stellar", rank: 28, symbol: "XLM", name: "Stellar", image: "https://cryptologos.cc/logos/stellar-xlm-logo.svg", circulatingSupply: 28700000000, totalSupply: 50000000000, ath: 0.8756, athDate: "2018-01-03", atl: 0.000476, atlDate: "2015-03-05" },
  cosmos: { id: "cosmos", rank: 25, symbol: "ATOM", name: "Cosmos", image: "https://cryptologos.cc/logos/cosmos-atom-logo.svg", circulatingSupply: 390000000, totalSupply: null, ath: 44.70, athDate: "2022-01-17", atl: 1.16, atlDate: "2020-03-13" },
  aptos: { id: "aptos", rank: 27, symbol: "APT", name: "Aptos", image: "https://cryptologos.cc/logos/aptos-apt-logo.svg", circulatingSupply: 452000000, totalSupply: null, ath: 19.92, athDate: "2023-01-26", atl: 3.08, atlDate: "2022-12-29" },
  arbitrum: { id: "arbitrum", rank: 32, symbol: "ARB", name: "Arbitrum", image: "https://cryptologos.cc/logos/arbitrum-arb-logo.svg", circulatingSupply: 2650000000, totalSupply: 10000000000, ath: 2.39, athDate: "2024-01-12", atl: 0.521, atlDate: "2023-09-11" },
  binancecoin: { id: "binancecoin", rank: 4, symbol: "BNB", name: "BNB", image: "https://cryptologos.cc/logos/bnb-bnb-logo.svg", circulatingSupply: 145887575, totalSupply: 145887575, ath: 690.87, athDate: "2025-06-06", atl: 0.03982, atlDate: "2017-10-19" },
  "bitcoin-cash": { id: "bitcoin-cash", rank: 15, symbol: "BCH", name: "Bitcoin Cash", image: "https://cryptologos.cc/logos/bitcoin-cash-bch-logo.svg", circulatingSupply: 19700000, totalSupply: 21000000, ath: 3785.00, athDate: "2017-12-20", atl: 76.93, atlDate: "2018-12-16" },
  toncoin: { id: "toncoin", rank: 9, symbol: "TON", name: "Toncoin", image: "https://cryptologos.cc/logos/toncoin-ton-logo.svg", circulatingSupply: 5100000000, totalSupply: null, ath: 8.24, athDate: "2024-06-15", atl: 0.39, atlDate: "2021-09-20" },
};

export async function fetchAllTickers(): Promise<BinanceTicker[]> {
  const res = await fetch(`${BINANCE_REST}/ticker/24hr?symbols=${JSON.stringify(ALL_BINANCE_SYMBOLS)}`);
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  return res.json();
}

export function tickerToMarketData(ticker: BinanceTicker): MarketData | null {
  const id = SYMBOL_TO_ID[ticker.symbol];
  if (!id) return null;
  const base = ticker.symbol.replace("USDT", "");
  const price = parseFloat(ticker.lastPrice);
  const quoteVolume = parseFloat(ticker.quoteVolume);
  const change = parseFloat(ticker.priceChange);
  const changePercent = parseFloat(ticker.priceChangePercent);
  const staticData = STATIC_COIN_DATA[id];

  if (staticData) {
    return {
      ...staticData,
      currentPrice: price,
      marketCap: price * staticData.circulatingSupply,
      volume24h: quoteVolume,
      priceChange24h: change,
      priceChangePercent24h: changePercent,
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
    };
  }

  return {
    id,
    rank: 0,
    symbol: base,
    name: KWN_NAMES[base] ?? base,
    image: `https://cryptologos.cc/logos/${base.toLowerCase()}-${base.toLowerCase()}-logo.svg`,
    currentPrice: price,
    marketCap: quoteVolume * 10,
    volume24h: quoteVolume,
    priceChange24h: change,
    priceChangePercent24h: changePercent,
    high24h: parseFloat(ticker.highPrice),
    low24h: parseFloat(ticker.lowPrice),
    circulatingSupply: 0,
    totalSupply: null,
    ath: 0,
    athDate: "",
    atl: 0,
    atlDate: "",
  };
}

export async function fetchMarketDataList(): Promise<MarketData[]> {
  const tickers = await fetchAllTickers();
  return tickers
    .map(tickerToMarketData)
    .filter((d): d is MarketData => d !== null)
    .sort((a, b) => b.volume24h - a.volume24h);
}

export async function fetchKlines(
  symbol: string,
  interval: string = "1h",
  limit: number = 168
): Promise<ChartDataPoint[]> {
  const MAX = 1000;
  let allData: ChartDataPoint[] = [];
  let endTime: string | undefined;

  while (allData.length < limit) {
    const remaining = limit - allData.length;
    const batchSize = Math.min(remaining, MAX);

    const params = new URLSearchParams({ symbol, interval, limit: String(batchSize) });
    if (endTime) params.set("endTime", endTime);

    const res = await fetch(`${BINANCE_REST}/klines?${params}`);
    if (!res.ok) throw new Error(`Klines API error: ${res.status}`);
    const batch = await res.json() as string[][];
    if (batch.length === 0) break;

    const parsed = batch.map((k) => ({
      timestamp: Number(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    allData = [...parsed, ...allData];
    if (batch.length < batchSize) break;
    endTime = String(Number(batch[0][0]) - 1);
  }

  return allData;
}

export async function fetchGlobalMarketData(tickers?: MarketData[]): Promise<MarketIndicators> {
  const btc = tickers?.find(t => t.id === "bitcoin");
  const eth = tickers?.find(t => t.id === "ethereum");
  const bnb = tickers?.find(t => t.id === "binancecoin");
  const btcPrice = btc?.currentPrice ?? 0;
  const ethPrice = eth?.currentPrice ?? 0;
  const bnbPrice = bnb?.currentPrice ?? 0;

  const ethBtcRatio = btcPrice > 0 ? ethPrice / btcPrice : 0;
  const bnbBtcRatio = btcPrice > 0 ? bnbPrice / btcPrice : 0;

  // Try CoinGecko via server-side proxy (properly cached)
  try {
    const res = await fetch("/api/global");
    if (res.ok) {
      const g = await res.json();
      if (!g.error) {
        return {
          totalMarketCap: g.totalMarketCap,
          totalVolume24h: g.totalVolume24h,
          btcDominance: g.btcDominance,
          ethDominance: g.ethDominance,
          bnbDominance: g.bnbDominance,
          usdtDominance: g.usdtDominance,
          othersDominance: g.othersDominance ?? 0,
          ethBtcRatio,
          bnbBtcRatio,
          totalExBtc: g.totalExBtc,
          totalExTop10: g.totalExTop10,
          change: g.change ?? undefined,
        };
      }
    }
  } catch { /* fallback */ }

  // Fallback: estimate from Binance USDT pairs + known coins
  let allUsdtTickers: BinanceTicker[] = [];
  try {
    const res = await fetch(`${BINANCE_REST}/ticker/24hr`);
    if (res.ok) {
      const all: BinanceTicker[] = await res.json();
      allUsdtTickers = all.filter((t) => t.symbol.endsWith("USDT"));
    }
  } catch { /* ignore */ }

  const symToId = Object.fromEntries(Object.entries(COIN_SYMBOL_MAP).map(([id, sym]) => [sym, id]));
  interface McEst { symbol: string; marketCap: number; volume: number; }
  const estimates: McEst[] = [];

  const stablecoins = new Set([
    "USDCUSDT", "FDUSDUSDT", "DAIUSDT", "TUSDUSDT", "USDPUSDT", "BUSDUSDT",
    "USD1USDT", "USDEUSDT", "USDSUSDT", "XUSDUSDT", "RLUSDUSDT", "BFUSDUSDT",
  ]);

  const isStableOrLeveraged = (s: string) =>
    stablecoins.has(s) || s.includes("UP") || s.includes("DOWN") ||
    s.includes("BULL") || s.includes("BEAR") || s.includes("BKRW") ||
    s.includes("EUR") || s.includes("GBP") || s.includes("TRY") || s.includes("BIDR");

  // Known coins with exact market cap from Binance price * circulating supply
  for (const t of allUsdtTickers) {
    const coinId = symToId[t.symbol];
    const staticData = coinId ? STATIC_COIN_DATA[coinId] : null;
    const price = parseFloat(t.lastPrice);
    const volume = parseFloat(t.quoteVolume);
    if (staticData && price > 0) {
      estimates.push({ symbol: t.symbol, marketCap: price * staticData.circulatingSupply, volume });
    }
  }

  // If Binance fetch failed entirely, use provided tickers
  if (allUsdtTickers.length === 0 && tickers && tickers.length > 0) {
    for (const md of tickers) {
      estimates.push({ symbol: md.symbol, marketCap: md.marketCap, volume: md.volume24h });
    }
  }

  // Unknown non-stablecoins: estimate with tiered volume-to-market-cap ratio
  for (const t of allUsdtTickers) {
    const coinId = symToId[t.symbol];
    if (coinId) continue;
    if (isStableOrLeveraged(t.symbol)) continue;

    const volume = parseFloat(t.quoteVolume);
    if (volume <= 0) continue;

    const ratio = volume > 1e9 ? 0.003
      : volume > 1e8 ? 0.008
        : volume > 1e7 ? 0.025
          : volume > 1e6 ? 0.07
            : 0.15;

    estimates.push({ symbol: t.symbol, marketCap: volume / ratio, volume });
  }

  estimates.sort((a, b) => b.marketCap - a.marketCap);
  const totalMarketCap = estimates.reduce((s, e) => s + e.marketCap, 0);
  const totalVolume24h = estimates.reduce((s, e) => s + e.volume, 0);

  const btcEst = estimates.find(e => e.symbol === "BTCUSDT");
  const ethEst = estimates.find(e => e.symbol === "ETHUSDT");
  const bnbEst = estimates.find(e => e.symbol === "BNBUSDT");
  const btcMc = btcEst?.marketCap ?? btc?.marketCap ?? 0;
  const ethMc = ethEst?.marketCap ?? eth?.marketCap ?? 0;
  const bnbMc = bnbEst?.marketCap ?? bnb?.marketCap ?? 0;

  const btcDominance = totalMarketCap > 0 ? (btcMc / totalMarketCap) * 100 : 55;
  const ethDominance = totalMarketCap > 0 ? (ethMc / totalMarketCap) * 100 : 10;
  const bnbDominance = totalMarketCap > 0 ? (bnbMc / totalMarketCap) * 100 : 2;
  const usdtDominance = 7.5;

  const top10Sum = estimates.slice(0, 10).reduce((s, e) => s + e.marketCap, 0);
  const top10Dominance = totalMarketCap > 0 ? (top10Sum / totalMarketCap) * 100 : 88;
  const othersDominance = Math.max(0, 100 - top10Dominance);

  return {
    totalMarketCap,
    totalVolume24h,
    btcDominance,
    ethDominance,
    bnbDominance,
    usdtDominance,
    othersDominance,
    ethBtcRatio,
    bnbBtcRatio,
    totalExBtc: totalMarketCap * (1 - btcDominance / 100),
    totalExTop10: totalMarketCap * (1 - btcDominance / 100 - ethDominance / 100),
  };
}

/** Map from ticker base symbol (e.g. "ETH") to coin ID */
const BASE_SYMBOL_TO_ID: Record<string, string> = {};
for (const [sym, id] of Object.entries(SYMBOL_TO_ID)) {
  const base = sym.replace("USDT", "");
  BASE_SYMBOL_TO_ID[base] = id;
}

export interface CoinVolumeData {
  baseAsset: string;
  coinId: string | null;
  price: number;
  priceChangePercent: number;
  volumeUsd: number;
  volumeBtc: number;
}

const STABLE_QUOTES = new Set(["USDT", "FDUSD", "USDC"]);
const EXCLUDED_BASES = new Set([
  "USDC", "FDUSD", "DAI", "TUSD", "USDP", "BUSD", "USD1", "USDE", "USDS",
  "XUSD", "RLUSD", "BFUSD", "EUR", "TRY", "GBP", "AUD", "BRL", "RUB", "BKRW",
  "BIDR", "UP", "DOWN", "BULL", "BEAR",
]);

export const COIN_SCREENER_MIN_VOL_BTC = 1000;

export async function fetchCoinVolumeScreen(): Promise<CoinVolumeData[]> {
  try {
    const res = await fetch(`${BINANCE_REST}/ticker/24hr`);
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    const all: BinanceTicker[] = await res.json();

    const btcTicker = all.find((t) => t.symbol === "BTCUSDT");
    const btcPrice = btcTicker ? parseFloat(btcTicker.lastPrice) : 0;
    if (!btcPrice) return [];

    // Aggregate volume by base asset across all stablecoin pairs
    const volMap = new Map<string, { volUsd: number; chg: number; price: number }>();

    for (const t of all) {
      for (const q of STABLE_QUOTES) {
        if (!t.symbol.endsWith(q) || t.symbol.length <= q.length) continue;
        const base = t.symbol.slice(0, -q.length);
        if (EXCLUDED_BASES.has(base) || base.length <= 1) continue;

        const vol = parseFloat(t.quoteVolume);
        if (vol <= 0) continue;

        const existing = volMap.get(base);
        if (existing) {
          existing.volUsd += vol;
        } else {
          volMap.set(base, {
            volUsd: vol,
            chg: parseFloat(t.priceChangePercent),
            price: parseFloat(t.lastPrice),
          });
        }
        break;
      }
    }

    const results: CoinVolumeData[] = [];
    for (const [base, data] of volMap) {
      const volBtc = data.volUsd / btcPrice;
      if (volBtc < COIN_SCREENER_MIN_VOL_BTC) continue;
      results.push({
        baseAsset: base,
        coinId: BASE_SYMBOL_TO_ID[base] ?? null,
        price: data.price,
        priceChangePercent: data.chg,
        volumeUsd: data.volUsd,
        volumeBtc: volBtc,
      });
    }

    results.sort((a, b) => Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent));
    return results;
  } catch {
    return [];
  }
}

export function createBinanceWebSocket(
  onTicker: (data: { s: string; c: string; v: string; h: string; l: string; P?: string }) => void
): WebSocket {
  const streams = ALL_BINANCE_SYMBOLS.map((s) => `${s.toLowerCase()}@ticker`).join("/");
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

  ws.onopen = () => {};
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const ticker = msg.stream && msg.data ? msg.data : msg;
      if (ticker.e === "24hrTicker" || ticker.s) {
        onTicker(ticker);
      }
    } catch { }
  };
  ws.onerror = () => {};
  ws.onclose = () => {};

  return ws;
}
