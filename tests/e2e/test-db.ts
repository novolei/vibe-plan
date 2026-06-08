import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for e2e tests.");
}

export const e2ePool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const e2eDb = drizzle(e2ePool, { schema });
