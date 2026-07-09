// ---------------------------------------------------------------------------
// Coin Metadata Repository
// Data sources: Binance exchangeInfo REST API, static overrides, /api/search
// ---------------------------------------------------------------------------

import { HttpClient, type RequestOptions } from "../http";

// ─── DTOs ─────────────────────────────────────────────────────────────────

interface ExchangeInfoResponse {
  readonly symbols: readonly ExchangeSymbolDTO[];
}

interface ExchangeSymbolDTO {
  readonly symbol: string;
  readonly status: string;
  readonly baseAsset: string;
  readonly quoteAsset: string;
}

interface SearchResponse {
  readonly results: readonly SearchResultDTO[];
}

interface SearchResultDTO {
  readonly symbol: string;
  readonly name: string;
  readonly binanceSymbol: string;
  readonly price: string;
  readonly changePercent: string;
  readonly volume: string;
}

// ─── Public DTOs ──────────────────────────────────────────────────────────

export interface CoinMetadata {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly image: string;
  readonly rank: number;
  readonly binanceSymbol: string;
  readonly circulatingSupply: number;
  readonly totalSupply: number | null;
  readonly ath: number;
  readonly athDate: string;
  readonly atl: number;
  readonly atlDate: string;
}

export interface CoinSearchResult {
  readonly symbol: string;
  readonly name: string;
  readonly binanceSymbol: string;
  readonly price: number;
  readonly changePercent: number;
  readonly volume: number;
}

// ─── Static Overrides ─────────────────────────────────────────────────────

const BINANCE_REST = "https://api.binance.com/api/v3";

const ID_OVERRIDES: Record<string, string> = {
  BTCUSDT: "bitcoin", ETHUSDT: "ethereum", BNBUSDT: "binancecoin", SOLUSDT: "solana",
  XRPUSDT: "ripple", DOGEUSDT: "dogecoin", ADAUSDT: "cardano", LINKUSDT: "chainlink",
  AVAXUSDT: "avalanche", DOTUSDT: "polkadot", LTCUSDT: "litecoin", BCHUSDT: "bitcoin-cash",
  ATOMUSDT: "cosmos", XLMUSDT: "stellar", APTUSDT: "aptos", ARBUSDT: "arbitrum",
  NEARUSDT: "near-protocol", TONUSDT: "toncoin",
};

const KNOWN_NAMES: Record<string, string> = {
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
  EGLD: "MultiversX", ALGO: "Algorand", VET: "VeChain", HBAR: "Hedera",
  TON: "Toncoin", QNT: "Quant", XTZ: "Tezos", EOS: "EOS", NEO: "Neo", KAVA: "Kava",
  ZEC: "Zcash", IOTA: "IOTA", COMP: "Compound", SNX: "Synthetix", "1INCH": "1inch",
  DYDX: "dYdX", LDO: "Lido DAO", STRK: "StarkNet", CFX: "Conflux", ROSE: "Oasis Network",
  WIF: "dogwifhat", JASMY: "JasmyCoin", RAY: "Raydium", CAKE: "PancakeSwap",
  GALA: "Gala", BEAM: "Beam", ORDI: "ORDI", ETHFI: "Ether.fi", PENDLE: "Pendle",
  NOT: "Notcoin", ZK: "zkSync", SUPER: "SuperVerse", TWT: "Trust Wallet", HOT: "Holo",
  ANKR: "Ankr", WOO: "WOO Network", RVN: "Ravencoin", LRC: "Loopring", BAND: "Band Protocol",
  SFP: "SafePal", SKL: "SKALE", OCEAN: "Ocean Protocol", CELO: "Celo", ICX: "ICON",
  ZEN: "Horizen", STX: "Stacks", ARKM: "Arkham", BLUR: "Blur", GMX: "GMX", ZRX: "0x",
};

const STATIC_METADATA: Record<string, Omit<CoinMetadata, "binanceSymbol"> & { binanceSymbol?: string }> = {
  bitcoin: { id: "bitcoin", symbol: "BTC", name: "Bitcoin", image: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg", rank: 1, circulatingSupply: 19700000, totalSupply: 21000000, ath: 73750, athDate: "2024-03-14", atl: 67.81, atlDate: "2013-07-06" },
  ethereum: { id: "ethereum", symbol: "ETH", name: "Ethereum", image: "https://cryptologos.cc/logos/ethereum-eth-logo.svg", rank: 2, circulatingSupply: 120200000, totalSupply: null, ath: 4878, athDate: "2021-11-10", atl: 0.433, atlDate: "2015-10-20" },
  solana: { id: "solana", symbol: "SOL", name: "Solana", image: "https://cryptologos.cc/logos/solana-sol-logo.svg", rank: 5, circulatingSupply: 463800000, totalSupply: 583900000, ath: 259.96, athDate: "2021-11-07", atl: 0.503, atlDate: "2020-05-11" },
  ripple: { id: "ripple", symbol: "XRP", name: "XRP", image: "https://cryptologos.cc/logos/xrp-xrp-logo.svg", rank: 7, circulatingSupply: 55200000000, totalSupply: 100000000000, ath: 3.84, athDate: "2018-01-07", atl: 0.00282, atlDate: "2014-05-22" },
  cardano: { id: "cardano", symbol: "ADA", name: "Cardano", image: "https://cryptologos.cc/logos/cardano-ada-logo.svg", rank: 8, circulatingSupply: 35400000000, totalSupply: 45000000000, ath: 3.10, athDate: "2021-09-02", atl: 0.01925, atlDate: "2020-03-13" },
  avalanche: { id: "avalanche", symbol: "AVAX", name: "Avalanche", image: "https://cryptologos.cc/logos/avalanche-avax-logo.svg", rank: 12, circulatingSupply: 394000000, totalSupply: 450000000, ath: 144.96, athDate: "2021-11-07", atl: 2.80, atlDate: "2020-12-31" },
  chainlink: { id: "chainlink", symbol: "LINK", name: "Chainlink", image: "https://cryptologos.cc/logos/chainlink-link-logo.svg", rank: 14, circulatingSupply: 587000000, totalSupply: 1000000000, ath: 52.88, athDate: "2021-05-10", atl: 0.1947, atlDate: "2019-01-05" },
  polkadot: { id: "polkadot", symbol: "DOT", name: "Polkadot", image: "https://cryptologos.cc/logos/polkadot-new-dot-logo.svg", rank: 15, circulatingSupply: 1428000000, totalSupply: null, ath: 54.98, athDate: "2021-11-04", atl: 2.70, atlDate: "2020-08-20" },
  "near-protocol": { id: "near-protocol", symbol: "NEAR", name: "NEAR Protocol", image: "https://cryptologos.cc/logos/near-protocol-near-logo.svg", rank: 19, circulatingSupply: 1090000000, totalSupply: null, ath: 20.44, athDate: "2022-01-16", atl: 0.527, atlDate: "2021-11-04" },
  dogecoin: { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", image: "https://cryptologos.cc/logos/dogecoin-doge-logo.svg", rank: 9, circulatingSupply: 144700000000, totalSupply: null, ath: 0.7316, athDate: "2021-05-08", atl: 0.000085, atlDate: "2015-05-06" },
  litecoin: { id: "litecoin", symbol: "LTC", name: "Litecoin", image: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg", rank: 18, circulatingSupply: 75000000, totalSupply: 84000000, ath: 410.26, athDate: "2021-05-10", atl: 1.15, atlDate: "2015-01-14" },
  stellar: { id: "stellar", symbol: "XLM", name: "Stellar", image: "https://cryptologos.cc/logos/stellar-xlm-logo.svg", rank: 28, circulatingSupply: 28700000000, totalSupply: 50000000000, ath: 0.8756, athDate: "2018-01-03", atl: 0.000476, atlDate: "2015-03-05" },
  cosmos: { id: "cosmos", symbol: "ATOM", name: "Cosmos", image: "https://cryptologos.cc/logos/cosmos-atom-logo.svg", rank: 25, circulatingSupply: 390000000, totalSupply: null, ath: 44.70, athDate: "2022-01-17", atl: 1.16, atlDate: "2020-03-13" },
  aptos: { id: "aptos", symbol: "APT", name: "Aptos", image: "https://cryptologos.cc/logos/aptos-apt-logo.svg", rank: 27, circulatingSupply: 452000000, totalSupply: null, ath: 19.92, athDate: "2023-01-26", atl: 3.08, atlDate: "2022-12-29" },
  arbitrum: { id: "arbitrum", symbol: "ARB", name: "Arbitrum", image: "https://cryptologos.cc/logos/arbitrum-arb-logo.svg", rank: 32, circulatingSupply: 2650000000, totalSupply: 10000000000, ath: 2.39, athDate: "2024-01-12", atl: 0.521, atlDate: "2023-09-11" },
  binancecoin: { id: "binancecoin", symbol: "BNB", name: "BNB", image: "https://cryptologos.cc/logos/bnb-bnb-logo.svg", rank: 4, circulatingSupply: 145887575, totalSupply: 145887575, ath: 690.87, athDate: "2025-06-06", atl: 0.03982, atlDate: "2017-10-19" },
  "bitcoin-cash": { id: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash", image: "https://cryptologos.cc/logos/bitcoin-cash-bch-logo.svg", rank: 15, circulatingSupply: 19700000, totalSupply: 21000000, ath: 3785.00, athDate: "2017-12-20", atl: 76.93, atlDate: "2018-12-16" },
  toncoin: { id: "toncoin", symbol: "TON", name: "Toncoin", image: "https://cryptologos.cc/logos/toncoin-ton-logo.svg", rank: 9, circulatingSupply: 5100000000, totalSupply: null, ath: 8.24, athDate: "2024-06-15", atl: 0.39, atlDate: "2021-09-20" },
};

// Resolve Binance symbol from coin ID
const ID_TO_SYMBOL: Record<string, string> = {};
for (const [sym, id] of Object.entries(ID_OVERRIDES)) {
  ID_TO_SYMBOL[id] = sym;
}

// ─── Repository ───────────────────────────────────────────────────────────

export class CoinMetadataRepository {
  private readonly exchangeApi: HttpClient;
  private readonly api: HttpClient;

  constructor() {
    this.exchangeApi = new HttpClient({
      baseUrl: BINANCE_REST,
      timeout: 10_000,
      retryCount: 1,
      retryBaseDelayMs: 300,
    });

    this.api = new HttpClient({
      timeout: 10_000,
      retryCount: 1,
      retryBaseDelayMs: 300,
    });
  }

  // ─── All known coins (static) ─────────────────────────────────────

  getAllStaticCoins(): readonly CoinMetadata[] {
    const result: CoinMetadata[] = [];
    for (const [id, meta] of Object.entries(STATIC_METADATA)) {
      result.push(this.enrichWithSymbol(id, meta));
    }
    return result;
  }

  // ─── Single coin (static + dynamic if available) ──────────────────

  async getCoin(
    coinId: string,
    options?: RequestOptions,
  ): Promise<CoinMetadata | null> {
    // Static data
    const staticMeta = STATIC_METADATA[coinId];
    if (staticMeta !== undefined) {
      return this.enrichWithSymbol(coinId, staticMeta);
    }

    // Try to resolve from exchange info
    const exchangeSymbol = ID_TO_SYMBOL[coinId] ?? `${coinId.replace("coin-", "").toUpperCase()}USDT`;
    const allSymbols = await this.fetchExchangeInfo(options);
    const found = allSymbols.find(
      (s) => s.symbol === exchangeSymbol || s.baseAsset.toLowerCase() === coinId.replace("coin-", ""),
    );

    if (found === undefined) return null;

    return {
      id: coinId,
      symbol: found.baseAsset,
      name: KNOWN_NAMES[found.baseAsset] ?? found.baseAsset,
      image: `https://cryptologos.cc/logos/${found.baseAsset.toLowerCase()}-${found.baseAsset.toLowerCase()}-logo.svg`,
      rank: 0,
      binanceSymbol: found.symbol,
      circulatingSupply: 0,
      totalSupply: null,
      ath: 0,
      athDate: "",
      atl: 0,
      atlDate: "",
    };
  }

  // ─── Search ───────────────────────────────────────────────────────

  async search(
    query: string,
    options?: RequestOptions,
  ): Promise<readonly CoinSearchResult[]> {
    const raw = await this.api.get<SearchResponse>(
      `/api/search?q=${encodeURIComponent(query)}`,
      options,
    );

    return raw.results.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      binanceSymbol: r.binanceSymbol,
      price: parseFloat(r.price),
      changePercent: parseFloat(r.changePercent),
      volume: parseFloat(r.volume),
    }));
  }

  // ─── Dynamic coin list from Binance ───────────────────────────────

  async getAllCoinsFromExchange(
    options?: RequestOptions,
  ): Promise<readonly CoinMetadata[]> {
    const symbols = await this.fetchExchangeInfo(options);
    const usdtPairs = symbols.filter(
      (s) => s.status === "TRADING" && s.quoteAsset === "USDT",
    );

    const seen = new Set<string>();
    const result: CoinMetadata[] = [];

    for (const pair of usdtPairs) {
      const baseAsset = pair.baseAsset;
      if (seen.has(baseAsset)) continue;
      seen.add(baseAsset);

      const coinId = ID_OVERRIDES[pair.symbol] ?? `coin-${baseAsset.toLowerCase()}`;
      const staticMeta = STATIC_METADATA[coinId];

      result.push({
        id: coinId,
        symbol: baseAsset,
        name: staticMeta?.name ?? KNOWN_NAMES[baseAsset] ?? baseAsset,
        image: staticMeta?.image ?? `https://cryptologos.cc/logos/${baseAsset.toLowerCase()}-${baseAsset.toLowerCase()}-logo.svg`,
        rank: staticMeta?.rank ?? 0,
        binanceSymbol: pair.symbol,
        circulatingSupply: staticMeta?.circulatingSupply ?? 0,
        totalSupply: staticMeta?.totalSupply ?? null,
        ath: staticMeta?.ath ?? 0,
        athDate: staticMeta?.athDate ?? "",
        atl: staticMeta?.atl ?? 0,
        atlDate: staticMeta?.atlDate ?? "",
      });
    }

    return result;
  }

  // ─── Private ──────────────────────────────────────────────────────

  private enrichWithSymbol(
    id: string,
    meta: Omit<CoinMetadata, "binanceSymbol"> & { binanceSymbol?: string },
  ): CoinMetadata {
    return {
      ...meta,
      binanceSymbol: ID_TO_SYMBOL[id] ?? `${meta.symbol}USDT`,
    };
  }

  private async fetchExchangeInfo(
    options?: RequestOptions,
  ): Promise<readonly ExchangeSymbolDTO[]> {
    const response = await this.exchangeApi.get<ExchangeInfoResponse>(
      "/exchangeInfo",
      options,
    );
    return response.symbols;
  }
}
