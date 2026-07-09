import type { AIProvider, AIProviderConfig } from "./abstract";

interface ClaudeResponse {
  content?: { text?: string }[];
  error?: { message: string };
}

export class ClaudeProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? "claude-sonnet-4-20250514";
  }

  async generate(prompt: string): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 500,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as ClaudeResponse;

    if (data.error) {
      throw new Error(`Claude API error: ${data.error.message}`);
    }

    const text = data.content?.[0]?.text;
    if (!text) {
      throw new Error("Claude returned empty response");
    }

    return text;
  }
}
