# Hono Starter

A production-ready starting point for JSON APIs, built on [Hono](https://hono.dev) and running natively on [Bun](https://bun.sh), with validation, error handling, and commit hygiene out of the box.

## Stack

| Concern                | Tool                                                        |
| ----------------------- | ------------------------------------------------------------ |
| Framework               | [Hono](https://hono.dev)                                    |
| Runtime / package manager | [Bun](https://bun.sh)                                      |
| Validation              | [Zod](https://zod.dev) + [@hono/zod-validator](https://github.com/honojs/middleware/tree/main/packages/zod-validator) |
| Testing                 | Bun's built-in test runner (`bun:test`)                      |
| Linting / formatting    | [Biome](https://biomejs.dev)                                 |
| Git hooks               | [lefthook](https://github.com/evilmartians/lefthook)          |
| Commit messages         | [commitlint](https://commitlint.js.org) (Conventional Commits) |

## Getting Started

Requires [Bun](https://bun.sh) `>=1.3.14`.

```bash
bun install
cp .env.example .env.local
bun dev
```

The server runs at `http://localhost:3000`.

## Scripts

| Command                     | Description                                  |
| ----------------------------- | ----------------------------------------------- |
| `bun dev`                    | Start the dev server with hot reload (loads `.env.local`) |
| `bun run build`               | Bundle the server for production into `dist/`  |
| `bun start`                   | Run the production build (`dist/index.js`)     |
| `bun run test` / `bun test`   | Run the test suite                             |
| `bun run lint` / `lint:fix`   | Lint with Biome                                |
| `bun run format` / `format:fix` | Format with Biome                            |
| `bun run check`               | Run Biome's combined lint + format check        |

## Project Structure

```
src/
  app.ts           # Hono app assembly: middleware + route mounting
  index.ts         # Entrypoint — Bun.serve config, exported as default
  lib/
    env.ts         # Typed, validated environment variables (Zod)
    errors.ts      # Centralized error handler
  routes/
    health.ts      # GET /health
    greet.ts       # GET /greet — example of a validated route
```

`app.ts` is exported separately from `index.ts` so routes can be tested directly via `app.request(...)` without binding a port.

## Adding a Route

Create a module under `src/routes` that exports a Hono instance, validate input with `@hono/zod-validator`, and mount it in `src/app.ts`:

```ts
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

const bodySchema = z.object({ title: z.string().min(1) });

export const todos = new Hono().post("/", zValidator("json", bodySchema), (c) => {
  const body = c.req.valid("json");
  return c.json({ created: body.title }, 201);
});
```

```ts
// src/app.ts
import { todos } from "#/routes/todos";
app.route("/todos", todos);
```

## Error Handling

Throw `HTTPException` (from `hono/http-exception`) for expected errors — it's caught by the centralized handler in `src/lib/errors.ts` and returned as `{ error: message }` with the right status code. Unexpected exceptions are logged and returned as a generic `500` (with the message attached outside of production, for debugging).

## Environment Variables

Copy `.env.example` to `.env.local` and adjust as needed. Env vars are parsed and validated at startup via `src/lib/env.ts` (Zod) — the process fails fast with a clear error if something required is missing or malformed.

- `PORT` — port the server listens on (default `3000`)
- `NODE_ENV` — `development` | `production` | `test`
- `CORS_ORIGINS` — comma-separated list of allowed origins

## Testing

Tests run with Bun's built-in test runner against the Hono app directly (no server needed):

```bash
bun run test
```

## Deployment

```bash
bun run build
bun start
```

A `Dockerfile` is included, targeting the official `oven/bun` image — build and run it behind any container host:

```bash
docker build -t hono-starter .
docker run -p 3000:3000 --env-file .env hono-starter
```

## Git Hooks & Commit Messages

[lefthook](https://github.com/evilmartians/lefthook) runs Biome (`check --write`) on staged files at commit time and validates commit messages against [Conventional Commits](https://www.conventionalcommits.org) via commitlint. Hooks are installed automatically via the `prepare` script on `bun install`.
