import { describe, it, expect } from "vitest";
import { signal } from "../signaling/engine";

describe("signal", () => {
  it("returns strong_buy for score 90-100", () => {
    expect(signal(90).action).toBe("strong_buy");
    expect(signal(95).action).toBe("strong_buy");
    expect(signal(100).action).toBe("strong_buy");
  });

  it("returns buy for score 75-89", () => {
    expect(signal(75).action).toBe("buy");
    expect(signal(80).action).toBe("buy");
    expect(signal(89).action).toBe("buy");
  });

  it("returns neutral for score 45-74", () => {
    expect(signal(45).action).toBe("neutral");
    expect(signal(60).action).toBe("neutral");
    expect(signal(74).action).toBe("neutral");
  });

  it("returns sell for score 20-44", () => {
    expect(signal(20).action).toBe("sell");
    expect(signal(30).action).toBe("sell");
    expect(signal(44).action).toBe("sell");
  });

  it("returns strong_sell for score 0-19", () => {
    expect(signal(0).action).toBe("strong_sell");
    expect(signal(10).action).toBe("strong_sell");
    expect(signal(19).action).toBe("strong_sell");
  });

  it("passes through the original score", () => {
    const r = signal(73);
    expect(r.score).toBe(73);
  });

  it("handles edge at boundaries", () => {
    expect(signal(90).action).toBe("strong_buy");
    expect(signal(89).action).toBe("buy");
    expect(signal(75).action).toBe("buy");
    expect(signal(74).action).toBe("neutral");
    expect(signal(45).action).toBe("neutral");
    expect(signal(44).action).toBe("sell");
    expect(signal(20).action).toBe("sell");
    expect(signal(19).action).toBe("strong_sell");
  });

  it("clamps values outside 0-100", () => {
    // no clamping in the function itself — inputs are expected to be valid
    expect(signal(999).action).toBe("strong_buy");
    expect(signal(-5).action).toBe("strong_sell");
  });
});
