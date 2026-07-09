import type { AIProvider, AIProviderConfig } from "./abstract";

interface OllamaResponse {
  message?: { content?: string };
  response?: string;
  error?: string;
}

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.baseUrl = config.baseUrl ?? "http://localhost:11434";
    this.model = config.model ?? "llama3.2";
  }

  async generate(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        options: {
          temperature: 0.3,
          num_predict: 500,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as OllamaResponse;

    if (data.error) {
      throw new Error(`Ollama error: ${data.error}`);
    }

    const text = data.message?.content;
    if (!text) {
      throw new Error("Ollama returned empty response");
    }

    return text;
  }
}
