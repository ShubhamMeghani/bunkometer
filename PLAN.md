# Bunk-o-Meter: Build Plan

| | |
|---|---|
| Spec | [SPEC.md **v0.3**](SPEC.md). SPEC says *what* to build; this plan says *in what order and how it is checked*. |
| Repo | https://github.com/ShubhamMeghani/bunkometer (branch `main`) |
| Production URL | _TBD. Filled in after H3._ |
| Status legend | `todo` · `pass` · `fail` · `Pending (human)` |

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 24 LTS (`.nvmrc`), npm. If Vercel rejects 24.x, use 22.x everywhere and add a Build note. |
| App | Next.js (latest stable, pinned), App Router, TypeScript `strict`, `src/` layout |
| UI | Tailwind CSS. Charts are hand-written SVG. No UI kit. |
| Auth | Auth.js (next-auth v5): Google provider, plus a test-only credentials login. JWT sessions. |
| Database | Neon Postgres through `@neondatabase/serverless` (HTTP), Drizzle ORM, drizzle-kit migrations |
| Validation | zod |
| Tests | Vitest (unit, `tests/unit/`), Playwright and `@axe-core/playwright` (E2E, `e2e/`) |
| Hosting and CI | Vercel Hobby, default function region `iad1` (next to Neon `us-east-1`). GitHub Actions on `ubuntu-24.04`. |
| Database branches | Production uses `main`. Preview deployments, local development and E2E use `dev` (SPEC C11). |

## Commands

| Command | What it does | Needs `.env.local` |
|---|---|---|
| `npm run check` | Lint, typecheck and unit tests. This is exactly what CI runs. | no |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint · `tsc --noEmit` · Vitest | no |
| `npm run test:e2e` | Playwright builds and starts the app on `:3100` with `E2E_TEST_AUTH=1` (set in `playwright.config.ts`), then runs `e2e/` against the **dev** database | yes |
| `npm run dev` | Dev server at http://localhost:3000. Real Google sign-in works here. | yes |
| `npm run db:generate` | Creates an SQL migration from `src/lib/db/schema.ts` | no |
| `npm run db:migrate` | Applies migrations to `DATABASE_URL` (locally, that is the `dev` branch) | yes |
| `npm run build` | Production build | no |
| `vercel-build` | Vercel only: `drizzle-kit migrate && next build`, against that environment's own database | Vercel env vars |

Run one test file with `npx vitest run tests/unit/engine/budget.test.ts` or `npx playwright test e2e/today.spec.ts`.

## Rules for the autonomous build

1. **SPEC.md (v0.3) is the source of truth.** Build what its requirements and ACs say, and nothing extra. Every task below cites the `R#` / `AC-#` it serves.
2. **One commit per phase.** Commit only when all of these hold:
   - every "Done when" AC for the phase passes;
   - `npm run check` is green;
   - the phase's E2E specs pass.
   
   Stage files by name. Use the message format `type(pN): summary`, with a final `Refs: R#, AC-#` line. The same commit updates this file's AC table (status and evidence). Evidence for Phase 1's Deploy ACs goes into the Phase 2 commit, because those checks happen after the owner pushes.
3. **Never push and never deploy.**
   - No `git push`.
   - No `vercel` or `vercel --prod`.
   - No `gh repo create --push`.
   - No force operations and no history rewrites.
   
   The owner pushes, and Vercel deploys on push.
4. **Never read `.env.local` or print environment values.**
   - Never open, `cat`, `type`, `Get-Content`, grep or copy any `.env*` file other than `.env.example`.
   - Never run `env`, `printenv`, `set` or `echo $VAR`.
   - Never log `process.env`.
   - Never run `vercel env pull`.
   - Never ask for a key in chat.
   
   Tools may load `.env.local` themselves (Next.js, drizzle-kit through `@next/env`, Playwright's web server); that is allowed. Check configuration only through behaviour, such as `/api/health` and test results.
5. **Stop only if a requirement or AC must change.** If an R or AC is impossible, contradictory, or must change before work can continue:
   - stop;
   - report the ID, the problem and a proposed SPEC change;
   - do not edit SPEC.md without approval.
   
   For every other ambiguity, make the smallest reasonable choice, record it in one line under [Build notes](#build-notes), and carry on.
6. **Don't wait for people.** If a [HUMAN] step isn't done, mark the ACs that depend on it `Pending (human)` and move to the next phase. Phases P2–P11 need only this machine and the Neon `dev` branch.
7. **Tests first for logic.** For engine code (P2, P5, P6, P7, P9 seed):
   - write the unit tests from SPEC's worked numbers first;
   - see them fail;
   - then implement.
8. **Never weaken a test to get a green run.** No `.skip`, no `.fixme`, no retries-to-green, no fixed sleeps. If an AC still can't pass, it stays `fail` with a note.
9. **Lean dependencies.** Allowed: `next`, `react`, `react-dom`, `typescript`, `@types/*`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`, `next-auth`, `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `zod`, `server-only`, `vitest`, `@playwright/test`, `@axe-core/playwright`. Pin exact versions. Anything else needs a Build note explaining why.
10. **Cross-platform scripts.** This machine runs Windows; CI runs Ubuntu. Don't use `rm -rf` or inline `VAR=1 cmd` in npm scripts. Put environment settings in config files.
11. **Database safety.** From this machine, only the `dev` branch is touched. E2E fixtures are inserted by the Playwright process, and every `<uuid>@e2e.test` user is deleted at the end of its spec file.
12. **Resuming.** Each unattended session starts with: *"Continue PLAN.md from the first phase whose Done-when ACs are not all `pass`."*

## Phase overview

| Phase | Name | Mode | Done when |
|---|---|---|---|
| **P1** | Deployment skeleton | AUTO + **HUMAN** | AC-14, AC-17 (local); AC-41, AC-42, AC-43 and the H5 sign-in smoke test (after H3–H5) |
| P2 | Core maths (engine) | AUTO | AC-1–9, AC-11, AC-46 |
| P3 | Data layer | AUTO | AC-15 |
| P4 | Core screens: setup, Today, Courses, Settings | AUTO | AC-19–26, AC-32, AC-34 |
| P5 | Trip planner | AUTO | AC-10, AC-27 |
| P6 | History, stats, CSV | AUTO | AC-12, AC-13, AC-29, AC-30 |
| P7 | Bulk marking | AUTO | AC-28 |
| P8 | Share templates | AUTO | AC-18, AC-31, AC-33 |
| P9 | Demo | AUTO | AC-16, AC-35 |
| P10 | Design and PWA | AUTO | AC-36–39 |
| P11 | E2E suite hardening | AUTO | AC-40, plus every Unit and E2E AC passing in one full run |
| **P12** | Release and verification | **HUMAN** + AUTO | AC-41–45 |

History (P6) comes before bulk marking (P7) because "Mark a range" lives on the History screen, and AC-28 checks its result there. P2–P11 run unattended and in order. P12 is the only phase after P1 that needs you.

## Your [HUMAN] steps

These are the only steps you need to do: **H1–H2 before the build starts**, **H3–H5 after the Phase 1 commit**, and **H6 at the end**. Never paste a secret into chat.

### H1. Neon (before P1, about 5 min)
1. At https://console.neon.tech, create a project called `bunkometer`. (Done: the project is in **AWS US East 1, N. Virginia**.)
2. Its default branch is the production branch. Neon may call it `main` or `production`; this plan calls it **main**.
3. Under **Branches**, create a branch called **`dev`** from main.
4. For **each** branch, open **Connect**, turn on **Connection pooling**, and copy the connection string. The host contains `-pooler` and the string ends with `sslmode=require`. Keep both strings private.

### H2. `.env.local` (before P1, about 2 min)
Create `C:\projects\bunkometer\.env.local` (it is already gitignored) with these lines:
```
DATABASE_URL=<dev pooled URL from H1>
AUTH_SECRET=<output of: openssl rand -base64 32>   (run in Git Bash)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```
Leave the two Google values empty until H4. Do **not** add `E2E_TEST_AUTH`; Playwright sets it.

### H3. Push and set up Vercel (after the P1 commit, about 10 min)
1. Run `git push origin main`.
2. At https://vercel.com/new, import `ShubhamMeghani/bunkometer`. The framework is detected as Next.js.
   - Do **not** add the Neon integration (it creates a branch for every preview).
   - The first build may fail until the variables below are set. That is expected.
3. In **Project → Settings → Environment Variables**, add:

   | Name | Value | Environments |
   |---|---|---|
   | `DATABASE_URL` | **main** pooled URL | Production only |
   | `DATABASE_URL` | **dev** pooled URL | Preview only |
   | `AUTH_SECRET` | a new `openssl rand -base64 32` value | Production + Preview |

4. Under **Deployments**, redeploy the latest deployment. Note the production domain (for example `https://bunkometer.vercel.app`).

### H4. Google OAuth client (after H3, about 10 min)
1. At https://console.cloud.google.com, create a project called `bunkometer`.
2. Open **Google Auth Platform** (formerly *APIs & Services → OAuth consent screen*).
   - **Branding:** app name `Bunk-o-Meter`, with your email as the support and developer contact.
   - **Audience:** External. Then click **Publish app** so the status is **In production**.
   - Add no extra scopes. The defaults `openid`, `email` and `profile` are enough.
3. Under **Clients → Create client**, choose **Web application** and enter these values exactly, with no trailing slashes:
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `https://<your-production-domain>`
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<your-production-domain>/api/auth/callback/google`
4. Add the client ID and client secret in two places:
   - **Vercel:** add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` for **Production + Preview**, then redeploy.
   - **`.env.local`:** fill in `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

### H5. Check Phase 1 (about 3 min)
1. Tell Claude the production URL. It isn't a secret.
2. On your phone, open the URL, tap **Sign in with Google**, and check that you land on `/setup`. Report pass or fail.
3. In the GitHub **Actions** tab, check that the CI run for your push is green. `gh` isn't installed here; if the repo is public, Claude can check this itself.

### H6. Release (after P11, about 15 min)
1. Run `git push origin main`. Wait for the Vercel production deploy and CI to finish, then tell Claude "pushed".
2. **AC-44:**
   - On your phone, sign in at the production URL, create a course and mark it Present.
   - Sign in on a second device and confirm you see the same mark.
   - Have one Google account that isn't on your team (for example your professor's) sign in once.
3. **AC-45:** in Android Chrome, choose **Install app**. Check that it opens standalone at `/today`.
4. Report the results. Claude records them as evidence.

## Phases

### P1. Deployment skeleton
Prerequisites: H1 and H2.

| # | Task | Tag | Refs |
|---|---|---|---|
| 1.1 | Scaffold Next.js: App Router, TypeScript `strict`, `src/`, Tailwind, ESLint. Add `.nvmrc` (24), exact versions, the npm scripts above, and `.env.example` (variable names only). Run `npx playwright install chromium`. | [AUTO] | C1, C8, C10 |
| 1.2 | Vitest config (`tests/unit`). Playwright config: web server runs build + start on `:3100` with `E2E_TEST_AUTH=1`, 1 worker, Chromium, mobile viewport. | [AUTO] | C11 |
| 1.3 | `.github/workflows/ci.yml`: `ubuntu-24.04`, Node from `.nvmrc`, `npm ci`, lint, typecheck, unit tests. No secrets. | [AUTO] | R49 · AC-43 |
| 1.4 | Drizzle setup. **Full** §4.2 schema (all tables, checks, unique indexes, cascades) and the initial migration. `drizzle.config.ts` loads env through `@next/env`. Lazy `server-only` neon-http client. `vercel-build` = migrate + build. Run `npm run db:migrate` against `dev`. | [AUTO] | R4, D6, D9, D10 |
| 1.5 | `GET /api/health` (`select 1 from users limit 1`), plus a unit test with a mocked DB | [AUTO] | R48 · AC-17 |
| 1.6 | Auth.js setup. Edge-safe `auth.config.ts`. `auth.ts` with Google, JWT and `trustHost: true`. The sign-in callback upserts `google_id`, `email` and `name`. The session carries the user id, and a session whose user no longer exists counts as signed out. Middleware/proxy redirects signed-out users (R1 route list). Add sign-out. | [AUTO] | R1, R2, R6 (part) |
| 1.7 | `isTestMode()` = `E2E_TEST_AUTH === "1" && !VERCEL`. When it is true: enable the `test-login` credentials provider (`@e2e.test` emails) and let `getToday()` honour the `e2e_today` cookie. Otherwise `getToday()` uses the IST date. Add unit tests. | [AUTO] | R5, R28 · AC-14 |
| 1.8 | App shell:<br>• `/` with "Sign in with Google" and "Try the demo"<br>• placeholder `/setup`, `/today`, `/courses`, `/plan`, `/history` and `/settings`<br>• 5-tab bottom nav and dark-default theme tokens<br>• a public placeholder `/demo` that returns 200 | [AUTO] | R1, R44, R45 (base) |
| 1.9 | Phase 1 smoke test, `e2e/p1-smoke.spec.ts`: signed-out redirects; test login lands on `/setup`; `/api/health` returns 200 locally | [AUTO] | supports AC-18, AC-19 |
| 1.10 | README: what the app is, setup, env var names, commands. Run `npm run check` and the smoke test, both green, then commit `chore(p1): deployment skeleton`. | [AUTO] | — |
| 1.11 | **H3**: push, create the Vercel project, set env vars and region | [HUMAN] | R50 |
| 1.12 | **H4**: Google OAuth client and published consent screen | [HUMAN] | R2, D1, D2 |
| 1.13 | **H5**: production URL, Google sign-in smoke test, CI green | [HUMAN] | AC-43 |
| 1.14 | Verify production with `curl`:<br>• `/api/health` returns 200 with the exact body<br>• `/demo` returns 200<br>• `/api/auth/providers` lists only `google`<br>Record the evidence; it is committed with P2. | [AUTO] | AC-41, AC-42 |

**Done when:** AC-14 and AC-17 pass locally, and AC-41, AC-42, AC-43 and the H5 smoke test pass after H3–H5. P2 starts as soon as 1.10 is committed. It does not wait for H3–H5.

### P2. Core maths (engine): unattended
| # | Task | Tag | Refs |
|---|---|---|---|
| 2.1 | Write the unit tests first from SPEC §4.3 and §4.4.6–4.4.7 (E1–E14, edge cases 1–14), including the brute-force sweep and the AC-46 cases | [AUTO] | AC-1–9, 11, 46 |
| 2.2 | `engine/dates.ts`: ISO-date helpers using UTC-only arithmetic, plus `todayIST(instant)` | [AUTO] | R28 · AC-9 |
| 2.3 | `engine/sessions.ts`: `generateSessions` as in §4.3 (slot validity, no-class periods, extra classes, orphaned rows ignored) | [AUTO] | R10–R12, R18 · AC-8 |
| 2.4 | `engine/budget.ts`:<br>• countable filter and window split (midsem date inclusive)<br>• medical cap ordered across the semester<br>• integer H/A/R/U/met/K/S/N/best<br>• `formatPct` truncation<br>• status and headline rules a–g, including `Can't recover in this window · best X%` | [AUTO] | R22–R27 · AC-1–7, 46 |
| 2.5 | `engine/labs.ts`: makeup lifecycle and lab status | [AUTO] | R30, R31 · AC-11 |
| 2.6 | `engine/summary.ts`: choose the current window, compute each course's overall status (the worse of window and lab), and sort the cards | [AUTO] | R29 (logic) |
| 2.7 | Purity test: engine files import nothing outside `src/lib/engine` and contain no `Date.now(` or `new Date()` | [AUTO] | R28 · AC-9 |

**Done when:** AC-1–9, AC-11 and AC-46 pass.

### P3. Data layer: unattended
| # | Task | Tag | Refs |
|---|---|---|---|
| 3.1 | Tests first, then zod schemas for every input: semester, course (with preset defaults), slot, no-class period, extra class, mark, makeup, bulk range, plan range. Apply the §4.2 limits. The schemas are shared by the server and the demo. | [AUTO] | R8, R9, R19 · AC-15 |
| 3.2 | The data contract:<br>• `Snapshot`: the active semester with its courses, slots, periods and session rows<br>• `Actions`: an interface covering every mutation<br>Screens are client components that receive `snapshot`, `today` and `actions`, and the engine runs on the snapshot. The server implementation is written now; the demo implementation comes in P9. | [AUTO] | C7 |
| 3.3 | `server-only` repository:<br>• every query is filtered by the session's user id<br>• a missing or foreign id calls `notFound()`<br>• a loader returns the active-semester snapshot | [AUTO] | R3, R4 |
| 3.4 | Server actions. Each one validates with zod, returns a typed result and revalidates:<br>• marks: a row exists only while marked; future Present is refused<br>• extra classes and makeups<br>• create/update/delete for semester, course, slot and period, with mark counts for delete confirmation<br>• create and switch semester<br>• delete account, in one transaction | [AUTO] | R6, R11, R13, R14, R16, R18, R19, R30 |
| 3.5 | E2E fixture helper. Runs in the Playwright process and writes straight to the `dev` database (Drizzle + `@next/env`):<br>• inserts fixture semesters<br>• creates `<uuid>@e2e.test` users and sets `e2e_today`<br>• deletes the users after each spec file | [AUTO] | C11 |

**Done when:** AC-15 passes and `npm run db:migrate` runs cleanly on `dev`. Database behaviour is proven by the P4 E2E ACs.

### P4. Core screens: unattended
| # | Task | Tag | Refs |
|---|---|---|---|
| 4.1 | `/setup` wizard: dates → courses (preset rules) → timetable → holidays, with inline validation. Add an "Import from a link" field, which is wired up in P8. | [AUTO] | R7–R11 · AC-19 |
| 4.2 | Today screen:<br>• session list with the 4-way control: optimistic update, revert + Retry on failure, tap again to clear<br>• course headlines and empty-state reasons<br>• the "N classes need marking" list and the pending-makeups banner<br>• "Add extra class" sheet; Present disabled on future dates | [AUTO] | R15–R21, R31 · AC-20–23, 26 |
| 4.3 | Courses page: cards as in §4.4.4, with text and icon status, the current window first, the U badge, the lab summary, and sort order. Course detail page: session list, makeup date and completion, rule editing. | [AUTO] | R26, R29–R31 · AC-25, 26 |
| 4.4 | Settings:<br>• semester, courses, timetable (with slot validity) and no-class periods<br>• delete confirmations that show mark counts<br>• semester switcher and new semester<br>• sign out, and delete account (type `DELETE`) | [AUTO] | R6, R11–R14 · AC-24, 34 |
| 4.5 | Pages and actions respond not-found for foreign or missing IDs | [AUTO] | R3 · AC-32 |
| 4.6 | E2E specs: setup, today, today-empty, extra-class, save-failure, settings, courses, makeups, isolation, semesters | [AUTO] | AC-19–26, 32, 34 |

**Done when:** AC-19–26, AC-32 and AC-34 pass.

### P5. Trip planner: unattended
| # | Task | Tag | Refs |
|---|---|---|---|
| 5.1 | Tests first, then `engine/trip.ts`: effective range, `m` per window, the §4.4 re-run on H′/A′/R′, projected %, labs needing makeups, and Go / Careful / No-go | [AUTO] | R32, R33 · AC-10 |
| 5.2 | `/plan`: date range, results per course and per window, labs list, verdict banner and validation messages. Nothing is saved. | [AUTO] | R32, R33 · AC-27 |

**Done when:** AC-10 and AC-27 pass.

### P6. History, stats, CSV: unattended
| # | Task | Tag | Refs |
|---|---|---|---|
| 6.1 | Tests first, then `engine/stats.ts`: weekly trend, most-skipped weekday and streaks | [AUTO] | R36, R37 · AC-12 |
| 6.2 | Tests first, then `engine/csv.ts`: RFC 4180, CRLF, quoting, formula-prefix guard and filename | [AUTO] | R38 · AC-13 |
| 6.3 | `/history`: month calendar with markers, and a day editor that reuses the Today list | [AUTO] | R35 · AC-29 |
| 6.4 | Trend chart in SVG with a line at the required %, and a stats panel | [AUTO] | R36, R37 |
| 6.5 | Export CSV download | [AUTO] | R38 · AC-30 |

**Done when:** AC-12, AC-13, AC-29 and AC-30 pass.

### P7. Bulk marking: unattended
| # | Task | Tag | Refs |
|---|---|---|---|
| 7.1 | Tests first, then `engine/bulk.ts` `bulkPreview`: number of sessions affected and number of marks overwritten | [AUTO] | R34 |
| 7.2 | Server action that applies the change in one transaction (upserts scheduled rows, updates extra classes) | [AUTO] | R34 |
| 7.3 | "Mark a range" sheet in History: range, Absent/Medical, course multi-select (all by default), preview, confirm | [AUTO] | R34 · AC-28 |

**Done when:** AC-28 passes.

### P8. Share templates: unattended
| # | Task | Tag | Refs |
|---|---|---|---|
| 8.1 | Publish and revoke: the token is 16 random bytes in base64url. Settings shows a copy-link button. | [AUTO] | R39, R41 |
| 8.2 | `/share/[token]`: public read-only preview with no personal data or marks. A missing or revoked token shows a 404 page with "This link is no longer active". | [AUTO] | R39, R41 |
| 8.3 | Import:<br>• copies the semester, courses, slots and periods (no marks) and makes the copy active<br>• a signed-out visitor goes through Google sign-in with `callbackUrl` set back to the share page<br>• import is also reachable from `/setup` | [AUTO] | R40 |
| 8.4 | E2E specs: sharing flow; access checks including the share page; account deletion kills the link | [AUTO] | AC-18, 31, 33 |

**Done when:** AC-18, AC-31 and AC-33 pass.

### P9. Demo: unattended
| # | Task | Tag | Refs |
|---|---|---|---|
| 9.1 | Tests first, then a deterministic `demo/seed.ts` as in §4.8 | [AUTO] | R42 · AC-16 |
| 9.2 | Demo `Actions` implemented over `localStorage`: versioned key, try/catch with an in-memory fallback, and "Reset demo" | [AUTO] | R43 |
| 9.3 | `/demo/**` routes that reuse every screen with `DEMO_TODAY`: Demo banner, sharing and account actions disabled, no POST requests | [AUTO] | R42, R43 · AC-35 |

**Done when:** AC-16 and AC-35 pass.

### P10. Design and PWA: unattended
| # | Task | Tag | Refs |
|---|---|---|---|
| 10.1 | Theme: tokens for both themes, an inline `<head>` script, a Dark / Light / System choice in Settings, stored on the device | [AUTO] | R44 · AC-36 |
| 10.2 | Mobile pass: 360 px audit, 44×44 tap targets, bottom nav, safe-area insets | [AUTO] | R45 · AC-37 |
| 10.3 | Contrast: tune the palette and status chips (text plus icon) to meet AA in both themes; add the axe specs | [AUTO] | R46 · AC-38 |
| 10.4 | PWA:<br>• `app/manifest.ts`<br>• 192, 512 and maskable PNG icons (made with `next/og` or committed; no new dependencies)<br>• `public/sw.js` caching the app shell<br>• an offline notice, with marking disabled while offline | [AUTO] | R47 · AC-39 |

**Done when:** AC-36–39 pass.

### P11. E2E suite hardening: unattended
| # | Task | Tag | Refs |
|---|---|---|---|
| 11.1 | Bundle-scan spec: collect every JavaScript file loaded during the suite and assert that none contains a forbidden string | [AUTO] | R4 · AC-40 |
| 11.2 | Run `npm run check` and the full `npm run test:e2e` together and get them green. Then run `npx playwright test --repeat-each=2`. Fix the root cause of any flaky test (rule 8). | [AUTO] | all |
| 11.3 | Audit: every AC row below has a status and evidence. Finish the README with the demo link first, then commands, testing and deploy. | [AUTO] | — |

**Done when:** AC-40 passes, and AC-1–40 plus AC-46 all pass in a single full run.

### P12. Release and verification
| # | Task | Tag | Refs |
|---|---|---|---|
| 12.1 | **H6** step 1: push, wait for CI and the Vercel deploy | [HUMAN] | R50 |
| 12.2 | Re-verify production with `curl` (AC-41, AC-42). Check AC-43 through the GitHub API if the repo is public; otherwise use your report. | [AUTO] | AC-41–43 |
| 12.3 | **H6** steps 2–3: real-device checks | [HUMAN] | AC-44, AC-45 |
| 12.4 | Record the evidence and commit `docs(p12): release verification` | [AUTO] | — |

**Done when:** AC-41–45 pass.

## AC table

Evidence is filled in when an AC passes, as the test file plus the commit (Unit/E2E) or as a dated note (Deploy/Manual). The `planned:` entries show where each test will live.

| ID | Type | Phase | Status | Evidence |
|---|---|---|---|---|
| AC-1 | Unit | P2 | pass | `tests/unit/engine/budget.test.ts` (15 tests) · P2 commit |
| AC-2 | Unit | P2 | pass | `tests/unit/engine/budget.sweep.test.ts` (92,256 cases) · P2 commit |
| AC-3 | Unit | P2 | pass | `tests/unit/engine/format.test.ts` (5) + integer check in the sweep · P2 commit |
| AC-4 | Unit | P2 | pass | `tests/unit/engine/medical.test.ts` (4) · P2 commit |
| AC-5 | Unit | P2 | pass | `tests/unit/engine/countable.test.ts` (6) · P2 commit |
| AC-6 | Unit | P2 | pass | `tests/unit/engine/windows.test.ts` (3) · P2 commit |
| AC-7 | Unit | P2 | pass | `tests/unit/engine/edges.test.ts` (3) · P2 commit |
| AC-8 | Unit | P2 | pass | `tests/unit/engine/sessions.test.ts` (4) · P2 commit |
| AC-9 | Unit | P2 | pass | `tests/unit/engine/dates.test.ts`, `purity.test.ts` · P2 commit |
| AC-10 | Unit | P5 | pass | `tests/unit/engine/trip.test.ts` (6 tests) · P5 commit |
| AC-11 | Unit | P2 | pass | `tests/unit/engine/labs.test.ts` (4) · P2 commit |
| AC-12 | Unit | P6 | pass | `tests/unit/engine/stats.test.ts` (3 tests) · P6 commit |
| AC-13 | Unit | P6 | pass | `tests/unit/engine/csv.test.ts` (4 tests) · P6 commit |
| AC-14 | Unit | P1 | pass | `tests/unit/auth/test-mode.test.ts` (5 tests) · P1 commit |
| AC-15 | Unit | P3 | pass | `tests/unit/validation.test.ts` (11 tests) · P3 commit |
| AC-16 | Unit | P9 | pass | `tests/unit/demo-seed.test.ts` (9 tests) · P9 commit |
| AC-17 | Unit | P1 | pass | `tests/unit/api/health.test.ts` (2 tests) · P1 commit |
| AC-18 | E2E | P8 | pass | `e2e/access.spec.ts` · P8 commit |
| AC-19 | E2E | P4 | pass | `e2e/setup.spec.ts` · P4 commit |
| AC-20 | E2E | P4 | pass | `e2e/today.spec.ts` · P4 commit |
| AC-21 | E2E | P4 | pass | `e2e/today-empty.spec.ts` · P4 commit (2 tests) |
| AC-22 | E2E | P4 | pass | `e2e/extra-class.spec.ts` · P4 commit (2 tests) |
| AC-23 | E2E | P4 | pass | `e2e/save-failure.spec.ts` · P4 commit |
| AC-24 | E2E | P4 | pass | `e2e/settings.spec.ts` · P4 commit (2 tests) |
| AC-25 | E2E | P4 | pass | `e2e/courses.spec.ts` · P4 commit |
| AC-26 | E2E | P4 | pass | `e2e/makeups.spec.ts` · P4 commit |
| AC-27 | E2E | P5 | pass | `e2e/plan.spec.ts` · P5 commit |
| AC-28 | E2E | P7 | pass | `e2e/bulk.spec.ts` (+ `tests/unit/bulk.test.ts`) · P7 commit |
| AC-29 | E2E | P6 | pass | `e2e/history.spec.ts` (also checks the R36 trend chart renders) · P6 commit |
| AC-30 | E2E | P6 | pass | `e2e/csv.spec.ts` · P6 commit |
| AC-31 | E2E | P8 | pass | `e2e/share.spec.ts` · P8 commit |
| AC-32 | E2E | P4 | pass | `e2e/isolation.spec.ts` · P4 commit |
| AC-33 | E2E | P8 | pass | `e2e/delete-account.spec.ts` · P8 commit |
| AC-34 | E2E | P4 | pass | `e2e/semesters.spec.ts` · P4 commit |
| AC-35 | E2E | P9 | pass | `e2e/demo.spec.ts` · P9 commit |
| AC-36 | E2E | P10 | todo | planned: `e2e/theme.spec.ts` |
| AC-37 | E2E | P10 | todo | planned: `e2e/mobile.spec.ts` |
| AC-38 | E2E | P10 | todo | planned: `e2e/a11y.spec.ts` |
| AC-39 | E2E | P10 | todo | planned: `e2e/pwa.spec.ts` |
| AC-40 | E2E | P11 | todo | planned: `e2e/bundle-scan.spec.ts` |
| AC-41 | Deploy | P1 (re-checked P12) | Pending (human) | Needs H3 (Vercel deploy). Local `/api/health` 200 verified in `e2e/p1-smoke.spec.ts`. |
| AC-42 | Deploy | P1 (re-checked P12) | Pending (human) | Needs H3 (Vercel deploy). Unit side covered by AC-14. |
| AC-43 | Deploy | P1 (re-checked P12) | Pending (human) | Needs H3 push; `.github/workflows/ci.yml` added, `npm run check` green locally. |
| AC-44 | Manual | P12 | todo | planned: owner report (date, devices, accounts) |
| AC-45 | Manual | P12 | todo | planned: owner report (device, browser) |
| AC-46 | Unit | P2 | pass | `tests/unit/engine/cant-recover.test.ts` (3) · P2 commit |

## Build notes

Choices made during the build, one line each: date, phase, the choice, and why.

- 2026-10-22 · P1 · TypeScript pinned to 6.0.3 (not 7.x): `typescript-eslint` supports `<6.1`. ESLint pinned to 9.39.5 for the same reason.
- 2026-10-22 · P1 · Added `@next/env` (16.4.2, ships with Next.js) as a dev dependency so drizzle-kit and the Playwright fixtures load `.env.local` without Claude reading it.
- 2026-10-22 · P1 · No `proxy.ts`: every signed-in page and action calls `requireUser()` on the server, which also signs out sessions of deleted users (R1, R6). Auth.js runs on the Node runtime only.
- 2026-10-22 · P1 · Neon project is in AWS US East 1, so Vercel keeps its default function region `iad1`; the `sin1` step was removed from H3 (SPEC v0.3, D8).
- 2026-10-22 · P2 · AC-7 "every window shows Final" assumes each window has held classes; a window with H + R = 0 follows rule a (`No classes in this window`), as §4.4.4 defines. The test fixture gives both split windows held classes.
- 2026-10-22 · P3 · One pure reducer (`src/lib/data/mutations.ts`) serves the optimistic UI, the demo and the server. The server loads the user's own snapshot, validates, applies the reducer and writes only the row diff in one Neon `batch` (a transaction), so a foreign ID can only ever come back as "Not found" (R3).
- 2026-10-22 · P4 · `/setup` collects dates, courses, slots and holidays locally and saves them in one `createSemester` call, so an abandoned wizard leaves nothing half-saved.
- 2026-10-22 · P4 · E2E specs wait for the server-action POST (`clickAndSave`) before reloading; saving is optimistic, so a reload mid-request would otherwise race the save.
- 2026-10-22 · P6 · §4.6 "weeks with H = 0 are skipped" is read as the week's own held count, which is what the AC-12 fixture expects ([80.0, 66.6] with no marks in week 3).
- 2026-10-22 · P7 · The bulk preview's "overwritten" count is existing marks whose status would change (a Medical mark re-marked Medical isn't counted).
