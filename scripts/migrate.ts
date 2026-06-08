import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const db = drizzle(pool);

async function main() {
  await migrate(db, { migrationsFolder: "./db/migrations" });
}

main()
  .finally(async () => {
    await pool.end();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
