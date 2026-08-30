import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

const querySchema = z.object({
	name: z.string().min(1).max(50).default("Hono"),
});

export const greet = new Hono().get(
	"/",
	zValidator("query", querySchema),
	(c) => {
		const { name } = c.req.valid("query");
		return c.json({ message: `Hello, ${name}!` });
	},
);
