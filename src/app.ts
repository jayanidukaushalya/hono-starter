import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { env } from "#/lib/env";
import { errorHandler } from "#/lib/errors";
import { greet } from "#/routes/greet";
import { health } from "#/routes/health";

export const app = new Hono();

app.use(logger());
app.use(secureHeaders());
app.use(
	"*",
	cors({
		origin: env.CORS_ORIGINS,
	}),
);

app.route("/health", health);
app.route("/greet", greet);

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError(errorHandler);
