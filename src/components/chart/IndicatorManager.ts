import type { IndicatorId, IndicatorConfig } from "./types";

// ─── Default Configurations ────────────────────────────────────────────────

const DEFAULT_CONFIGS: IndicatorConfig[] = [
  { id: "volume", label: "Volume", enabled: true, alwaysVisible: false, order: 0, stretchFactor: 0.15 },
  { id: "rsi", label: "RSI", enabled: false, alwaysVisible: false, order: 1, stretchFactor: 0.15 },
  { id: "dmi", label: "DMI", enabled: false, alwaysVisible: false, order: 2, stretchFactor: 0.18 },
];

// ─── Event Types ───────────────────────────────────────────────────────────

export type IndicatorEvent =
  | { type: "toggle"; id: IndicatorId; enabled: boolean }
  | { type: "reset" };

type Listener = (event: IndicatorEvent) => void;

// ─── Indicator Manager ─────────────────────────────────────────────────────

export class IndicatorManager {
  private indicators: Map<IndicatorId, IndicatorConfig>;
  private listeners: Set<Listener>;

  constructor() {
    this.indicators = new Map(
      DEFAULT_CONFIGS.map((c) => [c.id, { ...c }])
    );
    this.listeners = new Set();
  }

  // ── State Queries ──────────────────────────────────────────────────────

  isEnabled(id: IndicatorId): boolean {
    return this.indicators.get(id)?.enabled ?? false;
  }

  getConfig(id: IndicatorId): IndicatorConfig | undefined {
    return this.indicators.get(id);
  }

  /** Returns visible indicator IDs in fixed order: Volume → RSI → DMI */
  getVisibleIds(): IndicatorId[] {
    return Array.from(this.indicators.values())
      .filter((c) => c.enabled)
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id);
  }

  /** Returns all indicator configs in order */
  getAll(): IndicatorConfig[] {
    return Array.from(this.indicators.values()).sort(
      (a, b) => a.order - b.order
    );
  }

  // ── Mutations ──────────────────────────────────────────────────────────

  toggle(id: IndicatorId): void {
    const config = this.indicators.get(id);
    if (!config || config.alwaysVisible) return;

    config.enabled = !config.enabled;
    this.emit({ type: "toggle", id, enabled: config.enabled });
  }

  enable(id: IndicatorId): void {
    const config = this.indicators.get(id);
    if (!config || config.alwaysVisible || config.enabled) return;

    config.enabled = true;
    this.emit({ type: "toggle", id, enabled: true });
  }

  disable(id: IndicatorId): void {
    const config = this.indicators.get(id);
    if (!config || config.alwaysVisible || !config.enabled) return;

    config.enabled = false;
    this.emit({ type: "toggle", id, enabled: false });
  }

  reset(): void {
    for (const config of this.indicators.values()) {
      config.enabled = config.alwaysVisible;
    }
    this.emit({ type: "reset" });
  }

  // ── Subscription ───────────────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: IndicatorEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
