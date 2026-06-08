import "server-only";

export type AIProviderRequest = {
  system: string;
  prompt: string;
  responseFormat?: "text" | "json";
};

export type AIProviderResponse = {
  text: string;
  model: string;
  provider: string;
};

export interface AIProvider {
  generate(request: AIProviderRequest): Promise<AIProviderResponse>;
}

