import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { auth } from "#/lib/auth";
import { env } from "#/lib/env";
import { errorHandler } from "#/lib/errors";
import { greet } from "#/routes/greet";
import { health } from "#/routes/health";
import { me } from "#/routes/me";

export const app = new Hono();

app.use(logger());
app.use(secureHeaders());
app.use(
	"*",
	cors({
		origin: env.CORS_ORIGINS,
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/health", health);
app.route("/greet", greet);
app.route("/me", me);

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError(errorHandler);
