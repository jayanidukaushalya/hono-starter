import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { env } from "#/lib/env";

export const errorHandler: ErrorHandler = (err, c) => {
	if (err instanceof HTTPException) {
		return c.json({ error: err.message }, err.status);
	}

	console.error(err);

	return c.json(
		{
			error: "Internal Server Error",
			...(env.NODE_ENV !== "production" && { detail: err.message }),
		},
		500,
	);
};
