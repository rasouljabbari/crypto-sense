// ---------------------------------------------------------------------------
// Market Repository
// Data sources: Binance REST API, /api/global (Next.js proxy)
// ---------------------------------------------------------------------------

import { HttpClient } from "../http";
import type { MarketData, OHLCV } from "../../types";
import type { KlineInterval } from "../../types";

// ─── DTOs (wire format from Binance) ──────────────────────────────────────

interface BinanceTickerDTO {
  readonly symbol: string;
  readonly lastPrice: string;
  readonly priceChange: string;
  readonly priceChangePercent: string;
  readonly highPrice: string;
  readonly lowPrice: string;
  readonly volume: string;
  readonly quoteVolume: string;
  readonly count: number;
}

// Raw kline from Binance (string[][] — each item is a 12-element array)
type BinanceKlineDTO = readonly [
  number,   // 0  open time
  string,   // 1  open
  string,   // 2  high
  string,   // 3  low
  string,   // 4  close
  string,   // 5  volume
  number,   // 6  close time
  string,   // 7  quote asset volume
  number,   // 8  number of trades
  string,   // 9  taker buy base asset volume
  string,   // 10 taker buy quote asset volume
  string,   // 11 ignore
];

interface GlobalDataResponse {
  readonly totalMarketCap: number;
  readonly totalVolume24h: number;
  readonly btcDominance: number;
  readonly ethDominance: number;
  readonly bnbDominance: number;
  readonly usdtDominance: number;
  readonly othersDominance: number;
  readonly totalExBtc: number;
  readonly totalExTop10: number;
  readonly change?: GlobalDataChange | null;
  readonly updatedAt?: string;
}

interface GlobalDataChange {
  readonly totalMarketCap: number;
  readonly totalExBtc: number;
  readonly totalExTop10: number;
  readonly btcDominance: number;
  readonly ethDominance: number;
  readonly usdtDominance: number;
  readonly othersDominance: number;
}

// ─── Public DTO ───────────────────────────────────────────────────────────

export interface GlobalMarketSnapshot {
  readonly totalMarketCap: number;
  readonly totalVolume24h: number;
  readonly btcDominance: number;
  readonly ethDominance: number;
  readonly bnbDominance: number;
  readonly usdtDominance: number;
  readonly othersDominance: number;
  readonly totalExBtc: number;
  readonly totalExTop10: number;
  readonly change: GlobalDataChange | null;
  readonly updatedAt: string;
}

// ─── Static Configuration ─────────────────────────────────────────────────

const BINANCE_REST = "https://api.binance.com/api/v3";

const FUTURES_SYMBOLS: readonly string[] = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "TRXUSDT", "LINKUSDT", "AVAXUSDT",
  "DOTUSDT", "LTCUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "XLMUSDT", "FILUSDT", "ICPUSDT", "APTUSDT", "NEARUSDT",
  "ARBUSDT", "OPUSDT", "INJUSDT", "TIAUSDT", "SEIUSDT", "SUIUSDT", "WLDUSDT", "TAOUSDT", "AAVEUSDT", "UNIUSDT",
  "MKRUSDT", "RENDERUSDT", "FETUSDT", "ENAUSDT", "ONDOUSDT", "JUPUSDT", "PYTHUSDT", "BONKUSDT", "FLOKIUSDT",
  "SHIBUSDT", "THETAUSDT", "GRTUSDT", "SANDUSDT", "MANAUSDT", "AXSUSDT", "CHZUSDT", "FLOWUSDT", "EGLDUSDT", "ALGOUSDT",
  "VETUSDT", "HBARUSDT", "TONUSDT", "QNTUSDT", "XTZUSDT", "EOSUSDT", "NEOUSDT", "KAVAUSDT", "ZECUSDT", "IOTAUSDT",
  "COMPUSDT", "SNXUSDT", "1INCHUSDT", "DYDXUSDT", "LDOUSDT", "STRKUSDT", "CFXUSDT", "ROSEUSDT", "MEMEUSDT", "WIFUSDT",
  "JASMYUSDT", "RAYUSDT", "CAKEUSDT", "GALAUSDT", "BEAMUSDT", "ORDIUSDT", "ETHFIUSDT", "PENDLEUSDT", "NOTUSDT", "ZKUSDT",
  "SUPERUSDT", "TWTUSDT", "HOTUSDT", "ANKRUSDT", "WOOUSDT", "RVNUSDT", "LRCUSDT", "BANDUSDT", "SFPUSDT", "SKLUSDT",
  "OCEANUSDT", "CELOUSDT", "ICXUSDT", "ZENUSDT", "STXUSDT", "ARKMUSDT", "BLURUSDT", "GMXUSDT", "ZRXUSDT",
];

const ID_OVERRIDES: Record<string, string> = {
  BTCUSDT: "bitcoin", ETHUSDT: "ethereum", BNBUSDT: "binancecoin", SOLUSDT: "solana",
  XRPUSDT: "ripple", DOGEUSDT: "dogecoin", ADAUSDT: "cardano", LINKUSDT: "chainlink",
  AVAXUSDT: "avalanche", DOTUSDT: "polkadot", LTCUSDT: "litecoin", BCHUSDT: "bitcoin-cash",
  ATOMUSDT: "cosmos", XLMUSDT: "stellar", APTUSDT: "aptos", ARBUSDT: "arbitrum",
  NEARUSDT: "near-protocol", TONUSDT: "toncoin",
};

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
  HBAR: "Hedera", TON: "Toncoin", CAKE: "PancakeSwap", MEME: "Memecoin",
};

const STATIC_METADATA: Record<string, CoinMetadata> = {
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

interface CoinMetadata {
  readonly id: string;
  readonly rank: number;
  readonly symbol: string;
  readonly name: string;
  readonly image: string;
  readonly circulatingSupply: number;
  readonly totalSupply: number | null;
  readonly ath: number;
  readonly athDate: string;
  readonly atl: number;
  readonly atlDate: string;
}

// ─── Symbol Resolution ────────────────────────────────────────────────────

const SYMBOL_TO_ID: Record<string, string> = {};
const ID_TO_SYMBOL: Record<string, string> = {};
for (const sym of FUTURES_SYMBOLS) {
  const id = ID_OVERRIDES[sym] ?? `coin-${sym.replace("USDT", "").toLowerCase()}`;
  SYMBOL_TO_ID[sym] = id;
  ID_TO_SYMBOL[id] = sym;
}

// ─── Repository ───────────────────────────────────────────────────────────

export class MarketRepository {
  private readonly binance: HttpClient;
  private readonly api: HttpClient;

  constructor() {
    this.binance = new HttpClient({
      baseUrl: BINANCE_REST,
      timeout: 10_000,
      retryCount: 2,
      retryBaseDelayMs: 500,
    });

    this.api = new HttpClient({
      timeout: 10_000,
      retryCount: 1,
      retryBaseDelayMs: 300,
    });
  }

  // ─── Tickers ───────────────────────────────────────────────────────

  async getTickers(signal?: AbortSignal): Promise<readonly MarketData[]> {
    const symbolsParam = JSON.stringify([...FUTURES_SYMBOLS]);
    const raw = await this.binance.get<readonly BinanceTickerDTO[]>(
      `/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`,
      { signal },
    );

    return raw
      .map((t) => this.tickerToMarketData(t))
      .filter((d): d is MarketData => d !== null);
  }

  // ─── Single Ticker ─────────────────────────────────────────────────

  async getTicker(
    symbol: string,
    signal?: AbortSignal,
  ): Promise<MarketData | null> {
    const params = new URLSearchParams({ symbol });
    const raw = await this.binance.get<BinanceTickerDTO>(
      `/ticker/24hr?${params}`,
      { signal },
    );

    return this.tickerToMarketData(raw);
  }

  // ─── Klines ────────────────────────────────────────────────────────

  async getKlines(
    symbol: string,
    interval: KlineInterval | string = "1h",
    limit: number = 168,
    signal?: AbortSignal,
  ): Promise<readonly OHLCV[]> {
    const MAX_BATCH = 1000;
    const all: OHLCV[] = [];
    let endTime: string | undefined;

    while (all.length < limit) {
      const remaining = limit - all.length;
      const batchSize = Math.min(remaining, MAX_BATCH);

      const params = new URLSearchParams({
        symbol,
        interval,
        limit: String(batchSize),
      });
      if (endTime !== undefined) {
        params.set("endTime", endTime);
      }

      const batch = await this.binance.get<readonly BinanceKlineDTO[]>(
        `/klines?${params}`,
        { signal },
      );

      if (batch.length === 0) break;

      const parsed: OHLCV[] = batch.map((k) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      // Prepend so final array is chronological
      all.unshift(...parsed);

      if (batch.length < batchSize) break;
      endTime = String(Number(batch[0][0]) - 1);
    }

    return all;
  }

  // ─── Global Market Data ────────────────────────────────────────────

  async getMarketOverview(signal?: AbortSignal): Promise<GlobalMarketSnapshot> {
    const raw = await this.api.get<GlobalDataResponse>("/api/global", { signal });

    return {
      totalMarketCap: raw.totalMarketCap,
      totalVolume24h: raw.totalVolume24h,
      btcDominance: raw.btcDominance,
      ethDominance: raw.ethDominance,
      bnbDominance: raw.bnbDominance,
      usdtDominance: raw.usdtDominance,
      othersDominance: raw.othersDominance,
      totalExBtc: raw.totalExBtc,
      totalExTop10: raw.totalExTop10,
      change: raw.change ?? null,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    };
  }

  // ─── Mapping ───────────────────────────────────────────────────────

  private tickerToMarketData(ticker: BinanceTickerDTO): MarketData | null {
    const coinId = SYMBOL_TO_ID[ticker.symbol];
    if (coinId === undefined) return null;

    const base = ticker.symbol.replace("USDT", "");
    const price = parseFloat(ticker.lastPrice);
    const quoteVolume = parseFloat(ticker.quoteVolume);
    const change = parseFloat(ticker.priceChange);
    const changePercent = parseFloat(ticker.priceChangePercent);
    const high = parseFloat(ticker.highPrice);
    const low = parseFloat(ticker.lowPrice);

    const meta = STATIC_METADATA[coinId];

    return {
      coinId,
      currentPrice: price,
      marketCap: meta !== undefined ? price * meta.circulatingSupply : quoteVolume * 10,
      volume24h: quoteVolume,
      priceChange24h: change,
      priceChangePercent24h: changePercent,
      high24h: high,
      low24h: low,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  getAllSymbols(): readonly string[] {
    return FUTURES_SYMBOLS;
  }

  resolveCoinId(binanceSymbol: string): string | undefined {
    return SYMBOL_TO_ID[binanceSymbol];
  }

  resolveBinanceSymbol(coinId: string): string | undefined {
    return ID_TO_SYMBOL[coinId];
  }

  getKnownCoins(): readonly CoinMetadata[] {
    return Object.values(STATIC_METADATA);
  }
}
