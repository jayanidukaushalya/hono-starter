import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { openApiSpec } from "#/lib/openapi-spec";

export const docs = new Hono()
	.get("/openapi", (c) => c.json(openApiSpec))
	.get("/docs", swaggerUI({ url: "/openapi" }));
