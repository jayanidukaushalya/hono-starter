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
    auth.ts        # Better Auth instance (drizzle adapter, email/password)
  routes/
    health.ts      # GET /health
    greet.ts       # GET /greet — example of a validated route
    me.ts          # GET /me — example route protected by requireAuth
  middleware/
    auth.ts        # requireAuth middleware — 401s if there's no valid session
  db/
    index.ts       # Drizzle client (Pool + drizzle instance), closeDb() for shutdown
    migrate.ts      # Applies migrations from drizzle/ — run via `bun run db:migrate`
    seed.ts         # Example seed script — run via `bun run db:seed`
    schema/
      index.ts      # Barrel export of all tables
      auth.ts        # user/session/account/verification tables (Better Auth)
drizzle/            # Generated SQL migrations + snapshots (committed to git)
drizzle.config.ts   # drizzle-kit config (schema location, migrations output, credentials)
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

## Database

Schema lives in `src/db/schema/` as plain Drizzle table definitions, one file per table, re-exported from `src/db/schema/index.ts`. `src/db/index.ts` exports a shared `db` client built on a `pg.Pool`, plus `closeDb()` for graceful shutdown.

**Workflow:**

1. Edit or add a table in `src/db/schema/`.
2. `bun run db:generate` — diffs the schema against migration history and writes a new SQL migration under `drizzle/`.
3. `bun run db:migrate` — applies any pending migrations to the database configured via `DATABASE_URL`.

Migration files are plain SQL and are committed to git — they're the source of truth for schema history, and running `db:migrate` again is a no-op if nothing is pending. `db:push` is available for quick local iteration (it syncs the schema directly, skipping migration files) but shouldn't be used against a database you care about.

`bun run db:seed` runs `src/db/seed.ts`, a plain script using the same `db` client — extend it with whatever fixture data your app needs.

## Authentication

Auth is handled by [Better Auth](https://www.better-auth.com), configured in `src/lib/auth.ts` with the Drizzle adapter and email/password sign-in. Its routes are mounted at `/api/auth/*` in `src/app.ts`:

- `POST /api/auth/sign-up/email` — create an account
- `POST /api/auth/sign-in/email` — sign in, sets a session cookie
- `POST /api/auth/sign-out` — sign out
- `GET /api/auth/get-session` — fetch the current session

Testing with curl/Postman: sign-in works fine, but sign-out and other state-changing calls need an `Origin` header matching a trusted origin (browsers send this automatically; curl doesn't) — CSRF protection rejects them otherwise.

The `user`, `session`, `account`, and `verification` tables (`src/db/schema/auth.ts`) were generated with `bunx @better-auth/cli generate --config src/lib/auth.ts --output src/db/schema/auth.ts` — re-run that (and `bun run db:generate`) after changing `auth.ts`, rather than hand-editing the schema.

**Protecting a route:** use the `requireAuth` middleware (`src/middleware/auth.ts`) — see `src/routes/me.ts` for a working example:

```ts
import { Hono } from "hono";
import { type AuthVariables, requireAuth } from "#/middleware/auth";

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
