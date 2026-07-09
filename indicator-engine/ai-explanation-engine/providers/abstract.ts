export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface AIProvider {
  generate(prompt: string): Promise<string>;
}
