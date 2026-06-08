import "server-only";

import { OpenAICompatibleProvider } from "@/lib/ai/openai-compatible-provider";
import type { AIProvider } from "@/lib/ai/provider";
import { serverEnv } from "@/lib/env/server";

export function createAIProvider(): AIProvider {
  if (serverEnv.AI_PROVIDER === "deepseek") {
    if (!serverEnv.DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is required when AI_PROVIDER=deepseek");
    }

    return new OpenAICompatibleProvider({
      apiKey: serverEnv.DEEPSEEK_API_KEY,
      baseURL: serverEnv.DEEPSEEK_BASE_URL,
      model: serverEnv.DEEPSEEK_MODEL,
      provider: "deepseek",
    });
  }

  if (!serverEnv.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
  }

  return new OpenAICompatibleProvider({
    apiKey: serverEnv.OPENAI_API_KEY,
    model: serverEnv.OPENAI_MODEL,
    provider: "openai",
  });
}

