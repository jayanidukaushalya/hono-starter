import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { auth } from "#/integrations/better-auth/auth";
import { env } from "#/lib/env";
import { errorHandler } from "#/lib/errors";
import { greet } from "#/routes/greet";
import { health } from "#/routes/health";
import { me } from "#/routes/me";

export const app = new Hono();

app.use(requestId());
app.use(logger());
app.use(secureHeaders());
app.use(
	"*",
	cors({
		origin: env.CORS_ORIGINS,
		credentials: true,
	}),
);
app.use(
	bodyLimit({
		maxSize: 100 * 1024,
		onError: (c) => c.json({ error: "Payload Too Large" }, 413),
	}),
);
app.use(timeout(10_000));

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/health", health);
app.route("/greet", greet);
app.route("/me", me);

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError(errorHandler);
