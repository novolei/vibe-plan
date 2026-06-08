import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";
import { serverEnv } from "@/lib/env/server";

const pool = new Pool({
  connectionString: serverEnv.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
