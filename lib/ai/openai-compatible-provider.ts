import "server-only";

import OpenAI from "openai";

import type { AIProvider, AIProviderRequest } from "@/lib/ai/provider";

type OpenAICompatibleProviderOptions = {
  apiKey: string;
  baseURL?: string;
  model: string;
  provider: string;
};

export class OpenAICompatibleProvider implements AIProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly provider: string;

  constructor(options: OpenAICompatibleProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
    this.model = options.model;
    this.provider = options.provider;
  }

  async generate(request: AIProviderRequest) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: request.system,
        },
        {
          role: "user",
          content: request.prompt,
        },
      ],
      response_format:
        request.responseFormat === "json"
          ? { type: "json_object" }
          : { type: "text" },
    });

    return {
      text: response.choices[0]?.message.content ?? "",
      model: this.model,
      provider: this.provider,
    };
  }
}

