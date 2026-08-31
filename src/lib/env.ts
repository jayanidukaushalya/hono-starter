import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	PORT: z.coerce.number().int().positive().default(3000),
	DATABASE_URL: z.string().url(),
	DATABASE_SSL: z
		.enum(["true", "false"])
		.default("false")
		.transform((value) => value === "true"),
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
	CORS_ORIGINS: z
		.string()
		.default("")
		.transform((value) =>
			value
				.split(",")
				.map((origin) => origin.trim())
				.filter(Boolean),
		),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
