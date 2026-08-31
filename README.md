# Hono Starter

A production-ready starting point for JSON APIs, built on [Hono](https://hono.dev) and running natively on [Bun](https://bun.sh), with validation, error handling, and commit hygiene out of the box.

## Stack

| Concern                | Tool                                                        |
| ----------------------- | ------------------------------------------------------------ |
| Framework               | [Hono](https://hono.dev)                                    |
| Runtime / package manager | [Bun](https://bun.sh)                                      |
| Database                | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team) + [node-postgres](https://node-postgres.com) |
| Authentication          | [Better Auth](https://www.better-auth.com) (email/password)  |
| Validation              | [Zod](https://zod.dev) + [@hono/zod-validator](https://github.com/honojs/middleware/tree/main/packages/zod-validator) |
| API docs                | Hand-written OpenAPI doc + [@hono/swagger-ui](https://github.com/honojs/middleware/tree/main/packages/swagger-ui) |
| Testing                 | Bun's built-in test runner (`bun:test`)                      |
| Linting / formatting    | [Biome](https://biomejs.dev)                                 |
| Git hooks               | [lefthook](https://github.com/evilmartians/lefthook)          |
| Commit messages         | [commitlint](https://commitlint.js.org) (Conventional Commits) |

## Getting Started

Requires [Bun](https://bun.sh) `>=1.3.14`.

```bash
bun install
cp .env.example .env.local   # set DATABASE_URL and BETTER_AUTH_SECRET (openssl rand -base64 32)
bun run db:migrate
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
| `bun run db:generate`         | Generate a SQL migration from schema changes    |
| `bun run db:migrate`          | Apply pending migrations to the database        |
| `bun run db:push`             | Push schema directly to the database (dev only, no migration file) |
| `bun run db:studio`           | Open Drizzle Studio to browse data              |
| `bun run db:seed`             | Run the seed script                             |

## Project Structure

```
src/
  app.ts           # Hono app assembly: middleware + route mounting
  index.ts         # Entrypoint — Bun.serve config, exported as default
  lib/
    env.ts         # Typed, validated environment variables (Zod)
    errors.ts      # Centralized error handler
    openapi-spec.ts # Hand-written OpenAPI doc — update when routes change
  routes/
    health.ts      # GET /health
    greet.ts       # GET /greet — example of a validated route
    me.ts          # GET /me — example route protected by requireAuth
    docs.ts        # GET /openapi (spec), GET /docs (Swagger UI)
  integrations/
    drizzle/
      client.ts     # Drizzle client (Pool + drizzle instance), closeDb() for shutdown
      migrate.ts     # Applies migrations from drizzle/ — run via `bun run db:migrate`
      seed.ts        # Example seed script — run via `bun run db:seed`
      schema/
        index.ts     # Barrel export of all tables — this is what drizzle.config.ts points at
        auth.ts       # user/session/account/verification tables (Better Auth)
    better-auth/
      auth.ts        # Better Auth instance (drizzle adapter, email/password)
      middleware.ts  # requireAuth middleware — 401s if there's no valid session
drizzle/            # Generated SQL migrations + snapshots (committed to git)
drizzle.config.ts   # drizzle-kit config (schema location, migrations output, credentials)
```

`app.ts` is exported separately from `index.ts` so routes can be tested directly via `app.request(...)` without binding a port.

Third-party integrations live under `src/integrations/<vendor>/` — everything a given vendor touches (client, config, schema, middleware) stays together, so adding or removing one doesn't mean hunting across `lib/`, `middleware/`, and `db/`. The one exception is `drizzle/schema/`: it holds tables for every vendor (including `better-auth`'s), because drizzle-kit needs a single schema entrypoint — "what tables exist" is the ORM's concern even when a table's shape is dictated by another vendor.

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

Add the route to `src/lib/openapi-spec.ts` too — see [API Docs](#api-docs) below.

## API Docs

`GET /openapi` serves an OpenAPI 3.0 document, `GET /docs` renders it with [Swagger UI](https://github.com/honojs/middleware/tree/main/packages/swagger-ui). The spec is hand-written in `src/lib/openapi-spec.ts`, not generated from routes — it's a plain object matching the [OpenAPI spec](https://swagger.io/specification/), so there's no other library to learn.

This means it can drift from the actual routes if you forget to update it. With a handful of routes that's easy to keep in sync by hand; if the route count grows enough that this becomes a real risk, look at [hono-openapi](https://hono.dev/examples/hono-openapi) (generates the doc from `describeRoute()`/`validator()` calls on each route instead) as a follow-up migration — it wasn't chosen here to keep this starter's route definitions plain and dependency-light.

Better Auth's own `/api/auth/*` routes aren't in this doc — they're handled internally by `auth.handler` and never touch `src/routes/`. Enable Better Auth's own [`openAPI()` plugin](https://www.better-auth.com/docs/plugins/open-api) in `src/integrations/better-auth/auth.ts` if you want interactive docs for those too (it ships its own reference UI, separate from this Swagger UI).

## Database

Schema lives in `src/integrations/drizzle/schema/` as plain Drizzle table definitions, one file per table, re-exported from `schema/index.ts`. `src/integrations/drizzle/client.ts` exports a shared `db` client built on a `pg.Pool`, plus `closeDb()` for graceful shutdown.

**Workflow:**

1. Edit or add a table in `src/integrations/drizzle/schema/`.
2. `bun run db:generate` — diffs the schema against migration history and writes a new SQL migration under `drizzle/`.
3. `bun run db:migrate` — applies any pending migrations to the database configured via `DATABASE_URL`.

Migration files are plain SQL and are committed to git — they're the source of truth for schema history, and running `db:migrate` again is a no-op if nothing is pending. `db:push` is available for quick local iteration (it syncs the schema directly, skipping migration files) but shouldn't be used against a database you care about.

`bun run db:seed` runs `src/integrations/drizzle/seed.ts`, a plain script using the same `db` client — extend it with whatever fixture data your app needs.

## Authentication

Auth is handled by [Better Auth](https://www.better-auth.com), configured in `src/integrations/better-auth/auth.ts` with the Drizzle adapter and email/password sign-in. Its routes are mounted at `/api/auth/*` in `src/app.ts`:

- `POST /api/auth/sign-up/email` — create an account
- `POST /api/auth/sign-in/email` — sign in, sets a session cookie
- `POST /api/auth/sign-out` — sign out
- `GET /api/auth/get-session` — fetch the current session

Testing with curl/Postman: sign-in works fine, but sign-out and other state-changing calls need an `Origin` header matching a trusted origin (browsers send this automatically; curl doesn't) — CSRF protection rejects them otherwise.

The `user`, `session`, `account`, and `verification` tables (`src/integrations/drizzle/schema/auth.ts`) were generated with `bunx @better-auth/cli generate --config src/integrations/better-auth/auth.ts --output src/integrations/drizzle/schema/auth.ts` — re-run that (and `bun run db:generate`) after changing `auth.ts`, rather than hand-editing the schema.

**Protecting a route:** use the `requireAuth` middleware (`src/integrations/better-auth/middleware.ts`) — see `src/routes/me.ts` for a working example:

```ts
import { Hono } from "hono";
import { type AuthVariables, requireAuth } from "#/integrations/better-auth/middleware";

export const me = new Hono<{ Variables: AuthVariables }>().get("/", requireAuth, (c) =>
  c.json({ user: c.get("user") }),
);
```

**Defaults worth knowing about** (all from Better Auth itself, not custom code here):

- Cookies are `httpOnly` always, and `Secure` automatically in production — nothing to configure.
- CSRF protection (origin validation) is on by default and checked against `trustedOrigins`, which is set to `CORS_ORIGINS` — keep that list accurate in production.
- Rate limiting is enabled automatically in production (disabled in dev) — no config needed unless you want to customize it.
- Sessions last 7 days and refresh after 1 day of use; a signed cookie cache avoids a DB round trip on every request (5 minute TTL).
- Passwords are hashed with scrypt.
- `requireEmailVerification` is `false` — this starter has no email sending wired up. Turn it on once you configure `emailVerification.sendVerificationEmail` in `auth.ts` with a real mailer.

## Error Handling

Throw `HTTPException` (from `hono/http-exception`) for expected errors — it's caught by the centralized handler in `src/lib/errors.ts` and returned as `{ error: message }` with the right status code. Unexpected exceptions are logged and returned as a generic `500` (with the message attached outside of production, for debugging).

## Environment Variables

Copy `.env.example` to `.env.local` and adjust as needed. Env vars are parsed and validated at startup via `src/lib/env.ts` (Zod) — the process fails fast with a clear error if something required is missing or malformed.

- `PORT` — port the server listens on (default `3000`)
- `NODE_ENV` — `development` | `production` | `test`
- `DATABASE_URL` — PostgreSQL connection string
- `DATABASE_SSL` — `true` | `false` (default `false`) — require SSL for the database connection
- `BETTER_AUTH_SECRET` — signing secret for sessions/cookies, min 32 chars (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` — base URL of this API (default `http://localhost:3000`)
- `CORS_ORIGINS` — comma-separated list of allowed origins (also used as Better Auth's `trustedOrigins`)

## Testing

Tests run with Bun's built-in test runner against the Hono app directly (no server needed):

```bash
bun run test
```

## Deployment

```bash
bun run build
bun run db:migrate   # apply pending migrations before starting
bun start
```

Run migrations as a separate release step before starting new instances, rather than on every container boot — with multiple replicas, that avoids several instances racing to apply the same migration concurrently.

A `Dockerfile` is included, targeting the official `oven/bun` image — build and run it behind any container host:

```bash
docker build -t hono-starter .
docker run -p 3000:3000 --env-file .env hono-starter
```

## Git Hooks & Commit Messages

[lefthook](https://github.com/evilmartians/lefthook) runs Biome (`check --write`) on staged files at commit time and validates commit messages against [Conventional Commits](https://www.conventionalcommits.org) via commitlint. Hooks are installed automatically via the `prepare` script on `bun install`.
