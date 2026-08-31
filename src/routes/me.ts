import { Hono } from "hono";
import { type AuthVariables, requireAuth } from "#/middleware/auth";

export const me = new Hono<{ Variables: AuthVariables }>().get(
	"/",
	requireAuth,
	(c) => c.json({ user: c.get("user") }),
);
