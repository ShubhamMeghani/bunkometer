# Bunk-o-Meter

Know exactly how many classes you can skip.

A mobile-first web app for Indian college students. Mark each class Present / Absent / Medical / Cancelled, and see, per course and per evaluation window, exactly how many more classes you can skip while staying at or above the required percentage. It follows strict college rules: 79.99% is below 80%, medical counts as present, split midsem/endsem windows, and mandatory labs with makeups.

- **Try it without signing in:** `/demo`
- **Spec:** [SPEC.md](SPEC.md) · **Build plan and AC status:** [PLAN.md](PLAN.md)
- **Production URL:** _set after the first Vercel deploy_

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · Auth.js (Google) · Neon Postgres via Drizzle ORM · Vitest · Playwright · Vercel · GitHub Actions.

## Local setup

1. Node.js 24 (`.nvmrc`) and npm.
2. `npm ci`
3. Create `.env.local` (gitignored) from `.env.example`:
   - `DATABASE_URL`: the **dev** branch pooled connection string from Neon. Production uses `main`; local, preview and E2E use `dev`.
   - `AUTH_SECRET`: any random string, e.g. `openssl rand -base64 32`.
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: from the Google OAuth client (needed only for real Google sign-in).
4. `npm run db:migrate` applies the SQL migrations in `drizzle/` to the dev branch.
5. `npm run dev` and open http://localhost:3000.

## Commands

| Command | What it does |
|---|---|
| `npm run check` | Lint, typecheck and unit tests (what CI runs) |
| `npm test` | Vitest unit tests (`tests/unit/`) |
| `npm run test:e2e` | Playwright: builds and starts the app on port 3100 with test-only sign-in, against the dev database |
| `npm run db:generate` | Create a migration from `src/lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run build` | Production build. On Vercel, `vercel-build` runs migrations first. |

## Deploying

Vercel builds on every push to `main`. Environment variables (set in Vercel, never committed):

| Name | Production | Preview |
|---|---|---|
| `DATABASE_URL` | Neon `main` pooled URL | Neon `dev` pooled URL |
| `AUTH_SECRET` | random secret | random secret |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client | same |

Google OAuth redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://<production-domain>/api/auth/callback/google`.

`E2E_TEST_AUTH` must never be set on Vercel; test-only sign-in is also disabled whenever `VERCEL` is set.
