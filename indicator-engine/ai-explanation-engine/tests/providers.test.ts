import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAIProvider } from "../providers/openai";
import { GeminiProvider } from "../providers/gemini";
import { ClaudeProvider } from "../providers/claude";
import { OllamaProvider } from "../providers/ollama";

vi.stubGlobal("fetch", vi.fn());

beforeEach(() => {
  vi.clearAllMocks();
});

const mockFetchOk = (body: unknown) => {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });
};

const mockFetchError = (status: number, body: string) => {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  });
};

describe("GeminiProvider", () => {
  it("returns text from successful response", async () => {
    mockFetchOk({
      candidates: [{ content: { parts: [{ text: '{"summary":"test"}' }] } }],
    });

    const provider = new GeminiProvider({ apiKey: "test-key" });
    const result = await provider.generate("test prompt");

    expect(result).toBe('{"summary":"test"}');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws on API error", async () => {
    mockFetchError(401, "Unauthorized");

    const provider = new GeminiProvider({ apiKey: "bad-key" });
    await expect(provider.generate("test")).rejects.toThrow("Gemini API error: 401");
  });

  it("throws on empty response", async () => {
    mockFetchOk({ candidates: [] });

    const provider = new GeminiProvider({ apiKey: "test-key" });
    await expect(provider.generate("test")).rejects.toThrow("Gemini returned empty response");
  });
});

describe("ClaudeProvider", () => {
  it("returns text from successful response", async () => {
    mockFetchOk({
      content: [{ text: '{"summary":"test"}' }],
    });

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    const result = await provider.generate("test prompt");

    expect(result).toBe('{"summary":"test"}');
  });

  it("throws on API error", async () => {
    mockFetchError(401, "Unauthorized");

    const provider = new ClaudeProvider({ apiKey: "bad-key" });
    await expect(provider.generate("test")).rejects.toThrow("Claude API error: 401");
  });

  it("throws on API error in body", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Bad Request"),
    });

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    await expect(provider.generate("test")).rejects.toThrow("Claude API error: 400");
  });

  it("throws on empty response", async () => {
    mockFetchOk({ content: [] });

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    await expect(provider.generate("test")).rejects.toThrow("Claude returned empty response");
  });
});

describe("OllamaProvider", () => {
  it("returns text from successful response", async () => {
    mockFetchOk({
      message: { content: '{"summary":"test"}' },
    });

    const provider = new OllamaProvider({ apiKey: "" });
    const result = await provider.generate("test prompt");

    expect(result).toBe('{"summary":"test"}');
  });

  it("throws on API error", async () => {
    mockFetchError(500, "Internal Server Error");

    const provider = new OllamaProvider({ apiKey: "" });
    await expect(provider.generate("test")).rejects.toThrow("Ollama API error: 500");
  });

  it("throws on empty response", async () => {
    mockFetchOk({ message: {} });

    const provider = new OllamaProvider({ apiKey: "" });
    await expect(provider.generate("test")).rejects.toThrow("Ollama returned empty response");
  });

  it("uses custom baseUrl when provided", async () => {
    mockFetchOk({ message: { content: "ok" } });

    const provider = new OllamaProvider({ apiKey: "", baseUrl: "http://192.168.1.100:11434" });
    await provider.generate("test");

    const callUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callUrl).toBe("http://192.168.1.100:11434/api/chat");
  });
});

describe("OpenAIProvider", () => {
  it("throws when openai client returns empty choices", async () => {
    vi.mock("openai", () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({ choices: [] }),
          },
        },
      })),
    }));

    const { OpenAIProvider: OAI } = await import("../providers/openai");
    const provider = new OAI({ apiKey: "test-key" });

    await expect(provider.generate("test")).rejects.toThrow("OpenAI returned empty response");
  });

  it("throws when openai returns no content", async () => {
    vi.mock("openai", () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({ choices: [{ message: { content: null } }] }),
          },
        },
      })),
    }));

    const { OpenAIProvider: OAI } = await import("../providers/openai");
    const provider = new OAI({ apiKey: "test-key" });

    await expect(provider.generate("test")).rejects.toThrow("OpenAI returned empty response");
  });
});
