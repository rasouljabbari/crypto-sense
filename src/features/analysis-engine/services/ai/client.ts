// ---------------------------------------------------------------------------
// OpenAI Client
// ---------------------------------------------------------------------------

import OpenAI from "openai";

let _client: OpenAI | null = null;

export function createOpenAiClient(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "" || apiKey.startsWith("sk-") === false) {
    throw new Error(
      "OPENAI_API_KEY is not configured in environment variables.",
    );
  }

  _client = new OpenAI({ apiKey });
  return _client;
}
