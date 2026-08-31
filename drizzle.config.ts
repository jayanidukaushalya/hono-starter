import { defineConfig } from "drizzle-kit";
import { env } from "#/lib/env";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/integrations/drizzle/schema/index.ts",
	out: "./drizzle",
	dbCredentials: {
		url: env.DATABASE_URL,
		ssl: env.DATABASE_SSL,
	},
	strict: true,
	verbose: true,
});
