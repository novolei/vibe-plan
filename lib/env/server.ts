import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  AI_PROVIDER: z.enum(["openai", "deepseek"]).default("deepseek"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-chat"),
});

export const serverEnv = serverEnvSchema.parse({
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  AI_PROVIDER: process.env.AI_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
});
