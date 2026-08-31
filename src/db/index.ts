import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "#/lib/env";

export const pool = new Pool({
	connectionString: env.DATABASE_URL,
	ssl: env.DATABASE_SSL,
});

export const db = drizzle({ client: pool });

pool.on("error", (err) =>
	console.error("Unexpected error on idle Postgres client", err),
);

export async function closeDb(): Promise<void> {
	await pool.end();
}
