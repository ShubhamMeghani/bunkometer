# Bunk-o-Meter

**Know exactly how many classes you can skip.**

- **Live app:** https://bunkometer.vercel.app
- **For evaluators, with no sign-in needed:** https://bunkometer.vercel.app/demo

Bunk-o-Meter is a mobile-first web app for Indian college students. You mark each class with one tap: Present, Absent, Medical or Cancelled. For every course and every evaluation window, it then tells you exactly how many more classes you can skip and still stay at or above the required attendance. The maths is exact integer arithmetic, so 79.99% never rounds up to 80%.

## The demo (`/demo`)

The demo is a realistic IISc-style Aug–Dec 2026 semester, frozen at **Wed 21 Oct 2026** so it looks the same whenever it's opened. It shows every feature:

| Course | What it shows |
|---|---|
| PH 203 | **In danger** in its endsem window, even though its midsem window passed (windows are independent) |
| MA 211 | Very safe (split windows, tutorials count) |
| CH 201 | Recovering: tutorials not counted, and medical leave within a cap |
| CS 201 | Has a **pending makeup lab** |
| HS 201 | Has an extra Saturday class and a cancelled class |

Tap anything you like. Demo changes stay in your browser; **Settings → Reset demo** restores the seed.

## What it does

| Screen | Features |
|---|---|
| **Today** | One-tap marking. Extra classes on any date. "N classes need marking". Pending-makeup banner with makeup date and "Mark completed". |
| **Courses** | One card per course, worst first. The current window comes first and shows held, attended, current %, classes left, and the best % still possible. Headlines like *Can skip 5 more*, *Attend next 4 to reach 80%*, *No skips left*, *Can't recover in this window · best 71.4%*. |
| **Plan** | Trip planner: pick dates and see, per course and window, the classes you'd miss, your projected %, skips left, and labs needing makeups, plus an overall **Go / Careful / No-go**. Nothing is saved. |
| **History** | Month calendar showing classes, absences and unmarked days. Edit any day. "Mark a range" as Absent or Medical with a preview. Streaks, most-skipped weekday, CSV export. |
| **Course page** | Weekly attendance trend chart with the required-% line. Makeups and rule editing. |
| **Settings** | Semester dates, courses and rules, weekly timetable, holidays and exams, several semesters, Dark/Light/System theme, a read-only **share link** classmates can import as their own copy, sign out, delete account. |

Other details:
- Sign-in is with Google. We store only your name, email and Google ID, plus the attendance you record ([privacy policy](https://bunkometer.vercel.app/privacy)).
- It installs as an app on Android (PWA). Offline it opens read-only and pauses marking.

## Attendance rules and formulas

The college preset applies to every new course, and every rule can be edited per course:

- **Required %:** 80% by default (any whole number from 0 to 100).
- **Counting:** per class session. A 3-hour lab counts as one session.
- **What counts:** lectures always. Tutorials only if "tutorials count" is on. Labs never count toward the percentage.
- **Cancelled classes** don't count at all. **Extra classes** count like any other.
- **Medical** counts as attended. An optional cap per course limits how many medical sessions count; later ones count as absent. The earliest medical sessions in the semester count first.
- **Evaluation window:** the whole semester, or split into a **midsem** window (start → midsem date, inclusive) and an **endsem** window (the day after midsem → end). Each split window must meet the requirement on its own.
- **Labs:** every missed lab (absent or medical) becomes a **pending makeup** until it is marked completed. A makeup is **overdue** once its makeup date has passed.
- **Unmarked past classes** don't count either way; the app asks you to mark them. Absences you mark ahead of time count straight away.

For each course and window, with required % `p`:

- `H` = classes held (marked present, absent or medical)
- `A` = attended (present, plus medical within the cap)
- `R` = classes still to come (unmarked, from today on)

| Quantity | Formula |
|---|---|
| Requirement met | `100·A ≥ p·H` (integers; **strictly-below fails, no rounding**) |
| Current % | `floor(1000·A/H) / 10`, truncated to one decimal and never rounded up |
| Slack | `K = 100·(A+R) − p·(H+R)` |
| Skips left | `S = min(R, floor(K/100))` when `K ≥ 0` |
| Classes to attend in a row to get back to `p` | `N = ceil((p·H − 100·A) / (100 − p))` |
| Best % still possible | `floor(1000·(A+R)/(H+R)) / 10` |

**Status** is decided by the first rule that matches. It is always shown as text and an icon, never colour alone.

| Order | Condition | Status | Headline |
|---|---|---|---|
| 1 | No classes in the window | none | — |
| 2 | Nothing left (`R = 0`) | safe or danger | *Final X% · meets/below p%* |
| 3 | `K < 0` | danger | *Can't recover in this window · best X%* |
| 4 | `S = 0` | danger | *No skips left* |
| 5 | Below `p` now | warning | *Attend next N* |
| 6 | `S ≤ 2` | warning | *Can skip S more* |
| 7 | Otherwise | safe | *Can skip S more* |

Worked example: needs 80%, 17 of 20 attended, 20 classes left. `K = 3700 − 3200 = 500`, so you can skip **5 more**. That ends at 32/40 = exactly 80%, which passes; a 6th skip ends at 77.5%, which fails.

SPEC.md §4.4 has all 14 worked examples and the edge cases.

## Running it locally

1. Install Node.js 24 (see `.nvmrc`) and npm. Run `npm ci`.
2. Create `.env.local` (it is gitignored) from `.env.example`:
   - `DATABASE_URL`: the Neon **dev** branch pooled URL. Production uses `main`; local runs, preview deployments and E2E use `dev`.
   - `AUTH_SECRET`: a random secret, for example from `openssl rand -base64 32`.
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: the Google OAuth client. Only needed for real Google sign-in.
3. Run `npm run db:migrate`, then `npm run dev`, and open http://localhost:3000.

## Tests

| Command | What it runs |
|---|---|
| `npm run check` | Lint, typecheck and **109 unit tests** (Vitest). This is exactly what CI runs on `ubuntu-24.04`. |
| `npm run test:e2e` | **38 Playwright E2E tests** on a production build with a mobile viewport, against the dev database |
| `npm run db:generate` · `npm run db:migrate` | Create · apply SQL migrations (`drizzle/`) |

The unit tests cover:
- every SPEC worked example;
- a brute-force sweep of 92,256 cases that checks the maths against its definition;
- the edge cases, trip planner, statistics and CSV export;
- validation and the demo seed;
- a check that the engine never reads the clock.

The E2E tests cover:
- every screen and flow;
- one user being unable to see or change another user's records;
- sharing and importing, and account deletion;
- the demo;
- theme, the 360 px layout and tap sizes;
- an axe WCAG AA audit in both themes;
- the installable app and offline mode;
- a scan proving no database driver or secret reaches the browser.

E2E tests sign in through a test-only provider. It exists only when `E2E_TEST_AUTH=1` and the app is **not** on Vercel; production lists only Google (checked live).

## Deploying

Vercel builds on every push to `main`. `vercel-build` applies migrations to that environment's own database, then runs `next build`.

| Variable | Production | Preview |
|---|---|---|
| `DATABASE_URL` | Neon `main` (pooled) | Neon `dev` (pooled) |
| `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | set | set |

The Google OAuth redirect URIs are `https://bunkometer.vercel.app/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`. `GET /api/health` returns `{"ok":true,"db":true}`.

## Known limitations

- **No Google sign-in on preview deployments.** Vercel preview URLs change on every deploy and Google doesn't allow wildcard redirect URIs. Use production, localhost or `/demo`.
- **Offline is read-only.** The installed app opens offline from its cache, but marking needs a connection. There is no offline queue.
- **India time only.** "Today" is always the Asia/Kolkata date.
- **Required % must be a whole number** (e.g. 75, 80). Courses with different rules for lectures and tutorials aren't modelled; the only option is whether tutorials count at all.
- **Absences marked ahead of time count immediately**, so a planned trip lowers your current % now. The trip planner is the what-if tool; it saves nothing.
- **Share links are live.** A link shows the owner's current timetable. Each import is a frozen copy and doesn't receive later changes.
- **Free-tier hosting.** The Neon database sleeps when idle, so the first request after a pause can take a second or two. The database is in AWS US East, so pages are slower from India than a regional database would give.
- **E2E tests are not in CI.** They need a database, so they run locally against the Neon `dev` branch. CI runs lint, typecheck and unit tests.
- **The demo date is fixed** at 21 Oct 2026 on purpose.
- **Out of scope:** notifications, native apps, AI features, and syncing with a college's official attendance system.

## Spec-Driven Development files

This project was built with Spec-Driven Development: requirements → acceptance criteria → tests → code.

| File | Role |
|---|---|
| [SPEC.md](SPEC.md) | The specification: goal, users, constraints, data model, exact formulas with worked examples, 51 EARS requirements (R1–R51), 47 acceptance criteria (AC-1–AC-47), deployment risks, decisions, changelog |
| [PLAN.md](PLAN.md) | The build plan: 12 phases with [AUTO]/[HUMAN] tasks, the rules followed during the autonomous build, the AC status and evidence table, and build notes |
| `tests/unit/`, `e2e/` | One test file per AC, named in PLAN.md's AC table |
| Git history | One commit per phase, each referencing the `R#` / `AC-#` IDs it delivers |
