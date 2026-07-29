import { FEATURED_SYMBOLS } from "@/config/featured-coins";

export interface MarketCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface TickerData {
  symbol: string;
  base: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

export type TickerUpdateCallback = (tickers: Map<string, TickerData>) => void;

const BINANCE_REST = "https://api.binance.com/api/v3";
const BINANCE_WS = "wss://stream.binance.com:9443/ws";

class BinanceMarketService {
  private tickers = new Map<string, TickerData>();
  private listeners = new Set<TickerUpdateCallback>();
  private ws: WebSocket | null = null;
  private restInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30_000;
  private destroyed = false;
  private connected = false;

  subscribe(cb: TickerUpdateCallback): () => void {
    this.listeners.add(cb);
    cb(new Map(this.tickers));
    this.ensureConnection();
    return () => {
      this.listeners.delete(cb);
      if (this.listeners.size === 0) this.destroy();
    };
  }

  private ensureConnection() {
    if (this.ws || this.restInterval) return;
    // Immediate REST fetch so data shows up fast, even before WS connects
    this.fetchRest();
    this.connectWS();
  }

  private connectWS() {
    const streams = FEATURED_SYMBOLS.map((s) => `${s.toLowerCase()}@ticker`).join("/");
    this.ws = new WebSocket(`${BINANCE_WS}/${streams}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.connected = true;
      this.cleanupRest();
      this.notify();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.e === "24hrTicker") this.updateFromMessage(msg);
      } catch { /* ignore parse errors */ }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.ws = null;
      if (this.destroyed) return;
      this.startRestFallback();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxReconnectDelay);
    this.reconnectAttempts++;
    setTimeout(() => {
      if (this.destroyed || this.ws) return;
      this.connectWS();
    }, delay);
  }

  private startRestFallback() {
    if (this.restInterval) return;
    this.fetchRest();
    this.restInterval = setInterval(() => this.fetchRest(), 5000);
  }

  private cleanupRest() {
    if (this.restInterval) {
      clearInterval(this.restInterval);
      this.restInterval = null;
    }
  }

  private async fetchRest() {
    try {
      const symbols = JSON.stringify([...FEATURED_SYMBOLS]);
      const res = await fetch(`${BINANCE_REST}/ticker/24hr?symbols=${symbols}`);
      if (!res.ok) return;
      const data: any[] = await res.json();
      for (const t of data) {
        this.updateFromTicker(t);
      }
      this.notify();
    } catch { /* silent */ }
  }

  private updateFromMessage(msg: any) {
    const s = msg.s as string;
    if (!FEATURED_SYMBOLS.includes(s as any)) return;
    this.tickers.set(s, {
      symbol: s,
      base: s.replace("USDT", ""),
      price: parseFloat(msg.c),
      change24h: parseFloat(msg.p),
      changePercent24h: parseFloat(msg.P),
      high24h: parseFloat(msg.h),
      low24h: parseFloat(msg.l),
      volume24h: parseFloat(msg.v),
      quoteVolume24h: parseFloat(msg.q),
    });
    this.notify();
  }

  private updateFromTicker(t: any) {
    const s = t.symbol as string;
    if (!FEATURED_SYMBOLS.includes(s as any)) return;
    this.tickers.set(s, {
      symbol: s,
      base: s.replace("USDT", ""),
      price: parseFloat(t.lastPrice),
      change24h: parseFloat(t.priceChange),
      changePercent24h: parseFloat(t.priceChangePercent),
      high24h: parseFloat(t.highPrice),
      low24h: parseFloat(t.lowPrice),
      volume24h: parseFloat(t.volume),
      quoteVolume24h: parseFloat(t.quoteVolume),
    });
  }

  private notify() {
    const snapshot = new Map(this.tickers);
    for (const cb of this.listeners) {
      try { cb(snapshot); } catch { /* ignore */ }
    }
  }

  getConnected() { return this.connected; }

  private destroy() {
    this.destroyed = true;
    this.cleanupRest();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.tickers.clear();
    this.listeners.clear();
  }

  /** Fetch 1m kline data for candle charts */
  async fetchKlines(symbol: string, interval = "1m", limit = 50): Promise<MarketCandle[]> {
    try {
      const res = await fetch(
        `${BINANCE_REST}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      if (!res.ok) return [];
      const data: any[][] = await res.json();
      return data.map((k) => ({
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        timestamp: Number(k[0]),
      }));
    } catch {
      return [];
    }
  }

  /** Fetch kline data for sparkline (REST fallback) */
  async fetchSparkline(symbol: string): Promise<number[]> {
    try {
      const res = await fetch(
        `${BINANCE_REST}/klines?symbol=${symbol}&interval=1h&limit=24`
      );
      if (!res.ok) return [];
      const data: any[] = await res.json();
      return data.map((k) => parseFloat(k[4]));
    } catch {
      return [];
    }
  }
}

const globalInstance = new BinanceMarketService();
export default globalInstance;
