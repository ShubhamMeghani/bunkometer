# Bunk-o-Meter

Know exactly how many classes you can skip.

**Try it without signing in: open `/demo`** on the deployed app (production URL: _set after the first Vercel deploy_). The demo is a realistic Aug–Dec semester frozen at Wed 21 Oct 2026. One course is in danger, one is very safe, and one lab makeup is pending. Your changes stay in your browser.

Bunk-o-Meter is a mobile-first web app for Indian college students. You mark each class Present / Absent / Medical / Cancelled with one tap. For every course and evaluation window, it then shows exactly how many more classes you can skip and still stay at or above the required percentage. It follows strict college rules:

- 79.99% counts as below 80%; nothing is rounded up.
- Medical leave counts as present, with an optional cap per course.
- Tutorials can be counted or not, per course.
- Courses can use split midsem and endsem windows.
- Every missed lab needs a makeup.

| Screen | What it does |
|---|---|
| Today | One-tap marking, extra classes, "N classes need marking", pending makeups |
| Courses | Your budget per course and window: "Can skip 5 more", "Attend next 4 to reach 80%", "Can't recover in this window" |
| Plan | Trip planner: pick dates and see per-course impact plus a Go / Careful / No-go verdict |
| History | Calendar with a day editor, "Mark a range", streaks, most-skipped day, CSV export |
| Settings | Semester, courses and rules, timetable, holidays and exams, share link, theme, account deletion |

- **Spec:** [SPEC.md](SPEC.md)
- **Build plan and AC status:** [PLAN.md](PLAN.md)

## Stack

Next.js 16 (App Router, TypeScript), Tailwind CSS 4, Auth.js v5 (Google), Neon Postgres through Drizzle ORM, zod, Vitest, Playwright with axe, Vercel, GitHub Actions.

The attendance maths lives in `src/lib/engine/`. It is pure TypeScript with integer arithmetic and no clock reads, and the server, the demo and the tests all share it.

## Local setup

1. Install Node.js 24 (see `.nvmrc`) and npm.
2. Run `npm ci`.
3. Create `.env.local` (it is gitignored) from `.env.example`:
   - `DATABASE_URL`: the pooled connection string of the Neon **dev** branch. Production uses `main`. Local runs, preview deployments and E2E use `dev`.
   - `AUTH_SECRET`: any random string, for example from `openssl rand -base64 32`.
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: from the Google OAuth client. They are only needed for real Google sign-in.
4. Run `npm run db:migrate`. This applies the SQL migrations in `drizzle/` to the dev branch.
5. Run `npm run dev` and open http://localhost:3000.

## Testing

| Command | What it does |
|---|---|
| `npm run check` | Lint, typecheck and unit tests. This is exactly what CI runs. |
| `npm test` | Vitest unit tests (`tests/unit/`): worked examples, a brute-force sweep, edge cases |
| `npm run test:e2e` | Playwright: builds and starts the app on port 3100 with test-only sign-in, then runs `e2e/` against the dev database |
| `npm run db:generate` | Creates a migration from `src/lib/db/schema.ts` |
| `npm run db:migrate` | Applies migrations to `DATABASE_URL` |

How E2E tests sign in: they use a credentials provider that exists only when `E2E_TEST_AUTH=1` and `VERCEL` is unset. Playwright sets the flag itself. Each test creates its own `<uuid>@e2e.test` user and deletes it afterwards.

## Deploying

Vercel builds on every push to `main`. The `vercel-build` script applies migrations to that environment's database, then builds. Set these environment variables in Vercel; never commit them:

| Name | Production | Preview |
|---|---|---|
| `DATABASE_URL` | Neon `main` pooled URL | Neon `dev` pooled URL |
| `AUTH_SECRET` | random secret | random secret |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client | same |

Google OAuth redirect URIs:
- `http://localhost:3000/api/auth/callback/google`
- `https://<production-domain>/api/auth/callback/google`

Google sign-in works only on production and localhost; preview URLs change on every deploy.

Never set `E2E_TEST_AUTH` on Vercel. `GET /api/health` returns `{"ok":true,"db":true}` when the database answers.
