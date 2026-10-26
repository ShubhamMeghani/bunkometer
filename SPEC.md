# Bunk-o-Meter: Specification

| | |
|---|---|
| Version | 0.5 (open questions resolved; build plan in [PLAN.md](PLAN.md)) |
| Date | 2026-10-22 |
| Owner | Shubham Meghani |
| Builder | Claude Code, working mostly autonomously, ~1–2 days |
| Method | Spec-Driven Development: requirements `R#` → acceptance criteria `AC-#` → tests → code |

**Conventions.**
- **Must** means v1 is not accepted without it. **Should** means build it if time allows; the cut order is in §10.
- Requirements use EARS patterns (WHEN / IF…THEN / WHILE / WHERE / ubiquitous).
- Every AC is pass/fail and is tagged with how it is checked:
  - **Unit**: Vitest.
  - **E2E**: Playwright against a local production build.
  - **Deploy**: checked on the production URL or in CI.
  - **Manual**: a person checks it.
- Commit messages reference `R#` / `AC-#`.
- **Done** means every AC linked to a Must requirement passes.

---

## 1. Goal

Bunk-o-Meter is a mobile-first web app for Indian college students. A student records attendance for each class session. For every course and every evaluation window, the app then says exactly how many more classes they can skip and still stay at or above the required percentage.

The app follows the college's actual rules:
- Strict pass line: 79.99% is below 80%.
- Medical leave counts as present.
- Tutorials can be included or excluded per course.
- Courses can use split midsem/endsem windows.
- Labs are mandatory, and a missed lab needs a makeup.

All pass/fail decisions use exact integer maths.

**Success looks like this.** There is a deployed Vercel URL the professor can open.
- `/demo` works without signing in.
- A student can sign in with Google and set up a semester in under 5 minutes, or import a classmate's timetable.
- Marking a class takes one tap.
- The student always sees an honest "you can skip N more" for each course.

## 2. Users and main scenarios

**Users**
- **Student** (primary). Signed in with Google. Uses a phone 360–430 px wide and marks attendance daily.
- **Classmate.** Receives a share link and imports the timetable as their own semester.
- **Evaluator** (professor). Opens the production URL and explores `/demo`. May also sign in.
- **Builder** (Claude Code). Implements the app and proves each AC with tests.

**Scenarios**

| # | Scenario |
|---|---|
| S1 | **First run:** sign in → set semester dates → add courses (preset rules) → add weekly slots → add holidays/exams → land on Today. |
| S2 | **Daily marking:** open Today → tap Present / Absent / Medical / Cancelled for each class → the course's budget updates at once. |
| S3 | **"Can I bunk Friday?"** Open Courses and see "Can skip N more" for each course, current window first. |
| S4 | **Trip:** Plan → pick 12–16 Nov → see classes missed per course, the resulting %, safe or not, labs needing makeups, and an overall Go / Careful / No-go. |
| S5 | **Fell sick:** bulk-mark 3–7 Nov as Medical in one step. |
| S6 | **Missed lab:** the lab becomes a pending makeup → set a makeup date → mark it completed. |
| S7 | **Fix the past:** History calendar → tap a past day → change a mark. Review trends and streaks. Export CSV. |
| S8 | **Class rep shares:** publish a template link → classmates import an independent copy and track their own attendance. |
| S9 | **Evaluator:** opens `/demo` without signing in and sees a realistic semester with a course in danger, a very safe course and a pending makeup lab. |
| S10 | **Leaving:** delete the account → all data is removed. |

## 3. Constraints

- **C1. Stack (fixed).**
  - Next.js (App Router, TypeScript `strict`), Tailwind CSS, Vitest, Playwright.
  - Vercel Hobby, Neon Postgres (free tier), Auth.js (NextAuth v5) with the Google provider.
  - No AI APIs, no paid services, no third-party analytics or trackers.
- **C2. Database access.** Only server code (Server Components, Server Actions, Route Handlers) touches the database, through `DATABASE_URL`. The browser never talks to the database. Middleware/proxy (edge) never imports the DB client.
- **C3. Secrets.**
  - Only these names are used: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
  - Values live only in `.env.local` (gitignored) and in Vercel project settings.
  - `.env.example` lists the names with empty values.
  - The builder never asks for a key in chat, never reads `.env.local`, and never prefixes a secret with `NEXT_PUBLIC_`.
  - One extra variable, `E2E_TEST_AUTH`, is a non-secret flag that is never set on Vercel (see R5).
- **C4. Privacy.** For identity, store only the Google ID (`sub`), email and name. Do not store profile images or tokens. Use the Auth.js JWT session strategy, so there are no adapter tables. Never log emails.
- **C5. Dates and time.**
  - Calendar dates are ISO `YYYY-MM-DD` strings (Postgres `date`). Times are `HH:MM` (24 h).
  - Attendance logic never uses timestamps.
  - "Today" is the current date in **Asia/Kolkata**, worked out on the server.
  - Weeks start on Monday. The UI date format is `Wed, 21 Oct`.
- **C6. Exact maths.** Every pass/fail, budget and verdict decision uses integer arithmetic. Floating point is used only to format numbers for display.
- **C7. Architecture.**
  - The calculation engine (`src/lib/engine/`) is pure TypeScript. It does no I/O and has no clock reads: today is always a parameter.
  - The engine is shared by server pages, the demo and the tests.
  - Screens render from one data interface with two implementations: server (DB via Server Actions, validated with zod) and demo (browser `localStorage`).
- **C8. Lean dependencies, to fit 1–2 days.**
  - Charts are hand-written SVG.
  - The PWA uses `app/manifest.ts` plus a small hand-written `public/sw.js`, with no plugin.
  - No UI kit.
  - Proposed ORM: Drizzle with the `@neondatabase/serverless` HTTP driver (see OQ-11).
  - Pin exact versions of every dependency.
- **C9. Platforms.** Mobile-first, at 360 px and up. Primary target is Android Chrome. Also works on current desktop Chrome, Firefox and Safari. English UI.
- **C10. CI.**
  - GitHub Actions on `ubuntu-24.04` with one Node LTS major (pinned via `.nvmrc`; the same in CI and on Vercel).
  - Steps: `npm ci` → lint → typecheck → unit tests.
  - CI needs no secrets.
  - E2E tests run locally because they need a database.
- **C11. Database branches and E2E.**
  - Only Vercel **Production** uses the Neon `main` branch.
  - Vercel **Preview** deployments, local development and E2E runs use the Neon `dev` branch only.
  - `.env.local` therefore holds the `dev` URL.
  - Playwright runs against `next build && next start` with `E2E_TEST_AUTH=1`.
  - Tests create users `<uuid>@e2e.test` and delete them when finished.
- **C12. Delivery phases.** Phase 1 deploys a walking skeleton first: scaffold, CI, DB and migrations, `/api/health`, Google sign-in and test sign-in. The later phases, their order, and the phase each AC belongs to are defined in [PLAN.md](PLAN.md).

## 4. Inputs and outputs

### 4.1 Terms

| Term | Meaning |
|---|---|
| Semester | Has `start` and `end` dates (`start < end`) and an **optional** `midsem` date (`start < midsem < end` when given). The midsem date is needed only if a course uses split windows. A user may have several semesters; one is *active*. |
| Course | Belongs to a semester. Has its own rules: required % `p`, whether tutorials count, medical cap, and window mode. |
| Slot | A weekly timetable entry: weekday, start time, duration, kind (`lecture` / `tutorial` / `lab`). |
| No-class period | An inclusive date range (holiday, exam or other). No scheduled sessions happen inside it. |
| Session | One class meeting: either a *scheduled* occurrence of a slot on a date, or an *extra* class. **Every session counts as 1**, whatever its duration. |
| Mark | A session's status: `present`, `absent`, `medical`, `cancelled`, or none (*unmarked*). |
| Countable | A session that is not cancelled and is a lecture, or a tutorial in a course where tutorials count. Labs are never countable. |
| Window | The date range a requirement is checked over. Whole: `[start, end]`. Split: midsem `[start, midsem]` plus endsem `[midsem + 1 day, end]`. |
| Current window | The window that contains today. Before the semester it is the first window; after the semester it is the last. |
| Makeup | Attached to a lab marked absent or medical. It is *pending* until marked completed, and *overdue* if its makeup date is before today and it is not completed. |

### 4.2 Data model (Postgres, all IDs are `uuid`)

**users**

| Column | Notes |
|---|---|
| `id` | PK |
| `google_id` | text, unique, not null. Test users use `test:<email>`. |
| `email`, `name` | text, not null |
| `active_semester_id` | nullable FK → semesters, `on delete set null` |
| `created_at` | timestamptz |

**semesters**

| Column | Notes |
|---|---|
| `user_id` | FK → users, cascade |
| `name` | text, 1–60 characters |
| `start_date`, `end_date` | date, not null. Check `start < end` and `end − start ≤ 366 days`. |
| `midsem_date` | date, **nullable** (v0.5). When set, check `start < midsem < end`. |
| `share_token` | text, unique, nullable (null means not shared) |
| `created_at`, `updated_at` | |

**courses**

| Column | Notes |
|---|---|
| `semester_id` | FK, cascade |
| `code` | text, 1–16 characters, unique per semester (case-insensitive) |
| `name` | text, 1–80 characters |
| `colour` | one of 12 palette keys |
| `required_pct` | smallint, 0–100, default **80** |
| `count_tutorials` | bool, default **true** |
| `medical_cap` | smallint, nullable, 0–99. Null (the default) means no cap. |
| `window_mode` | `whole` or `split`, default **whole** |
| `sort_order` | |

**slots**

| Column | Notes |
|---|---|
| `course_id` | FK, cascade |
| `weekday` | 1 = Mon … 7 = Sun |
| `start_time` | time |
| `duration_min` | 15–240. Default 60; 180 for labs. |
| `kind` | `lecture` / `tutorial` / `lab` |
| `valid_from`, `valid_to` | nullable dates. Null means the semester bound. |

**no_class_periods**

| Column | Notes |
|---|---|
| `semester_id` | FK, cascade |
| `start_date`, `end_date` | inclusive, `start ≤ end` |
| `label` | text, 1–40 characters |
| `kind` | `holiday` / `exam` / `other` |

**sessions** stores marks and extra classes.

| Column | Notes |
|---|---|
| `course_id` | FK, cascade |
| `slot_id` | nullable FK → slots, cascade |
| `date`, `start_time`, `duration_min`, `kind` | |
| `is_extra` | bool. Must be true exactly when `slot_id` is null. |
| `status` | null, `present`, `absent`, `medical` or `cancelled` |
| `makeup_date` | nullable date |
| `makeup_done` | bool, default false |
| `updated_at` | |

Rules for **sessions**:
- `(slot_id, date)` is unique where `slot_id` is not null.
- The makeup fields may be set only when `kind = 'lab'` and `status ∈ {absent, medical}`.
- A scheduled occurrence has a row **only while it has a mark**. Clearing the mark deletes the row.
- Every extra class always has a row, and its `status` may be null.

**Limits** (enforced on the server):
- ≤ 10 semesters per user.
- ≤ 20 courses and ≤ 40 no-class periods per semester.
- ≤ 12 slots and ≤ 100 extra classes per course.

### 4.3 Session generation

`generateSessions(semester, courses, slots, periods, sessionRows)` returns, for each course:
1. For each slot, one scheduled session on every date `d` that meets all of these:
   - `max(semester.start, slot.valid_from) ≤ d ≤ min(semester.end, slot.valid_to)`
   - `weekday(d) = slot.weekday`
   - `d` is not inside any no-class period.
2. Each scheduled session takes its mark from the row with the same `(slot_id, date)`, if there is one.
3. Every extra-class row is included, on any date inside the semester, including weekends and no-class days.
4. A stored row whose `(slot_id, date)` is no longer generated (for example, the date became a holiday) is **ignored**, not deleted. It returns if the date becomes valid again.

**Fixture (AC-8).** Semester: start Mon 2026-08-03, midsem Sat 2026-09-26, end Sat 2026-11-28. No-class period: 2026-09-21 → 2026-09-26 (midsem exams). Slot: Mon 09:00 lecture.

| Change to the fixture | Sessions generated |
|---|---|
| None | **16** Mondays (Aug 3, 10, 17, 24, 31; Sep 7, 14, 28; Oct 5, 12, 19, 26; Nov 2, 9, 16, 23). Midsem window: 7. Endsem window: 9. |
| Add holiday Mon 2026-10-19 | 15 |
| Remove that holiday again | 16, and a mark stored on Oct 19 reappears |
| Set `valid_to = 2026-10-31` (no Oct 19 holiday) | 12 |

### 4.4 Attendance maths (the core)

#### 4.4.1 Inputs, for one course `c`, one window `W` and today `T`

- `p` = `c.required_pct`, an integer from 0 to 100.
- Only **countable** sessions whose date is in `W` take part.
- **Medical cap.** Order the course's countable medical sessions across the **whole semester** (all windows) by `(date, start_time)`.
  - If `medical_cap` is null, all of them count as attended.
  - Otherwise only the first `medical_cap` count as attended. The rest count as **absent** and are flagged "over cap".

#### 4.4.2 Counts

| Symbol | Definition |
|---|---|
| `H` (held) | Countable sessions in `W` whose status is present, absent or medical, **on any date**. Future-dated marks count as planned absences. |
| `A` (attended) | Present sessions plus medical sessions within the cap |
| `R` (remaining) | Countable sessions in `W` that are unmarked and dated `≥ T` (today's unmarked classes are still remaining) |
| `U` (needs marking) | Countable sessions in `W` that are unmarked and dated `< T`. They are **excluded** from H, A and R, and flagged in the UI. |

#### 4.4.3 Derived values (all integer maths)

| Name | Formula | Meaning |
|---|---|---|
| `met` | `H = 0` or `100·A ≥ p·H` | The requirement is satisfied right now. **No rounding.** |
| `cur` | `H > 0 ? floor(1000·A / H) / 10 : "—"` | Current %, **truncated** to one decimal |
| `K` | `100·(A + R) − p·(H + R)` | Slack in hundredths of a class |
| `reachable` | `K ≥ 0` | You can still meet `p` by the end of the window if you attend every remaining class |
| `S` (skips) | `reachable ? min(R, floor(K / 100)) : —` | The most of the `R` remaining classes you can skip and still finish the window at ≥ p |
| `N` (recover) | `(!met && reachable) ? ceil((p·H − 100·A) / (100 − p)) : —` | Classes in a row you must attend to get back to ≥ p. Never divides by zero: `!met && reachable` implies `p < 100`, and it guarantees `N ≤ R`. |
| `best` | `(H + R) > 0 ? floor(1000·(A + R) / (H + R)) / 10 : "—"` | The % at the end of the window if you attend everything that is left |

**Why the S formula is right.** Skipping `k` of the remaining classes ends the window at `(A + R − k) / (H + R)`. That passes exactly when `100·(A + R − k) ≥ p·(H + R)`, which is `k ≤ K / 100`.

Display rules:
- Percentages show one decimal plus `%`, for example `85.0%`.
- `p` shows as an integer, for example `80%`.
- Pass/fail is **never** decided from the displayed number.

#### 4.4.4 Status and headline: the first matching rule wins

| # | Condition | Status | Headline (exact text, ASCII apostrophe) |
|---|---|---|---|
| a | `H + R = 0` | none | `No classes in this window` |
| b | `R = 0` and `met` | safe | `Final {cur} · meets {p}%` |
| b′ | `R = 0` and not `met` | danger | `Final {cur} · below {p}%` |
| c | `K < 0` | danger | `Can't recover in this window · best {best}` |
| d | `S = 0` | danger | `No skips left · attend all {R}` |
| e | not `met` | warning | `Attend next {N} to reach {p}%` |
| f | `S ≤ 2` | warning | `Can skip {S} more` |
| g | otherwise | safe | `Can skip {S} more` |

Every window card also shows `H`, `A` (with the number of medical sessions), `cur`, `R`, `best`, and `U` when `U > 0`.

Rule **c** (decision OQ-6) applies when classes remain but even attending every one of them cannot reach `p`. The card shows `best`, the highest % still achievable in that window. When no classes remain (`R = 0`), rule **b′** takes precedence and the card shows the final result instead.

#### 4.4.5 Labs

Labs never affect any percentage. For each course with lab sessions, count:
- done = present, plus makeups completed
- missed = absent or medical
- pending = missed and makeup not completed
- overdue = pending and `makeup_date < T`
- cancelled labs are ignored

Lab status:
- **none** if the course has no lab sessions.
- otherwise **danger** if any makeup is overdue.
- otherwise **warning** if any makeup is pending.
- otherwise **safe**.

A course's overall status is the worse of its current-window status and its lab status. Order: danger > warning > safe > none.

#### 4.4.6 Worked examples (Unit-tested in AC-1)

| # | Case | p | H | A | R | cur | best | K | S | N | Status | Headline |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | Comfortable | 80 | 20 | 17 | 20 | 85.0% | 92.5% | 500 | 5 | — | safe | `Can skip 5 more` |
| E2 | Little slack | 80 | 20 | 17 | 5 | 85.0% | 88.0% | 200 | 2 | — | warning | `Can skip 2 more` |
| E3 | Below, recoverable | 80 | 10 | 7 | 20 | 70.0% | 90.0% | 300 | 3 | 5 | warning | `Attend next 5 to reach 80%` |
| E4 | Unreachable | 80 | 30 | 20 | 5 | 66.6% | 71.4% | −300 | — | — | danger | `Can't recover in this window · best 71.4%` |
| E5 | No skips left | 80 | 12 | 10 | 2 | 83.3% | 85.7% | 80 | 0 | — | danger | `No skips left · attend all 2` |
| E6 | No classes held yet | 80 | 0 | 0 | 40 | — | 100.0% | 800 | 8 | — | safe | `Can skip 8 more` |
| E7 | Empty window | 80 | 0 | 0 | 0 | — | — | 0 | 0 | — | none | `No classes in this window` |
| E8 | Strictly below, final | 80 | 49 | 39 | 0 | 79.5% | 79.5% | −20 | — | — | danger | `Final 79.5% · below 80%` |
| E9 | Exactly on the line, final | 80 | 25 | 20 | 0 | 80.0% | 80.0% | 0 | 0 | — | safe | `Final 80.0% · meets 80%` |
| E10 | 100% required, perfect so far | 100 | 10 | 10 | 10 | 100.0% | 100.0% | 0 | 0 | — | danger | `No skips left · attend all 10` |
| E11 | 100% required, one absence | 100 | 11 | 10 | 9 | 90.9% | 95.0% | −100 | — | — | danger | `Can't recover in this window · best 95.0%` |
| E12 | No requirement | 0 | 5 | 0 | 10 | 0.0% | 66.6% | 1000 | 10 | — | safe | `Can skip 10 more` |
| E13 | Rounding trap (synthetic) | 80 | 499 | 399 | 0 | 79.9% | 79.9% | −20 | — | — | danger | `Final 79.9% · below 80%` |
| E14 | Split endsem window, can't recover | 80 | 10 | 5 | 6 | 50.0% | 68.7% | −180 | — | — | danger | `Can't recover in this window · best 68.7%` |

**Checks:**
- **E1:** skipping 5 ends at 32/40 = 80% (passes). Skipping 6 ends at 31/40 = 77.5% (fails).
- **E3:** attending 5 gives 12/15 = 80%. Attending only 4 gives 11/14 = 78.6%.
- **E13:** rounding would display `80.0%`. Truncation shows `79.9%`, and `39900 < 39920` fails.
- **E14:** attending all 6 remaining gives 11/16 = 68.75%, which shows as `68.7%` (truncated; rounding would give 68.8%).

#### 4.4.7 Edge cases (each one is covered by an AC)

1. **No classes held yet** (E6, E7):
   - `cur` shows "—" and `met` is true.
   - If nothing is scheduled either, the status is none.
2. **Required 100%** (E10, E11):
   - Zero slack means danger whenever classes remain.
   - One absence makes the window unreachable.
   - `N` is never computed, so there is no division by zero.
3. **Cancelled and extra classes.** Example: p = 80, H = 9, A = 8, R = 21 gives S = 5.
   - Cancelling one future class gives R = 20, K = 480, S = 4. A cancellation removes a class from both the total and the remaining, so it can *lower* the budget.
   - Then adding a past extra class marked present gives H = 10, A = 9, R = 20, K = 500, S = 5, cur 90.0%.
   - Cancelled sessions never enter H or R.
4. **Medical.** Example: H = 20 with 14 present, 3 medical, 3 absent.
   - No cap: A = 17, 85.0%.
   - Cap 2: A = 16, 80.0%, met. The third medical is flagged "over cap".
   - Cap 1: A = 15, 75.0%, not met.
5. **Tutorials excluded.** Example: lectures H = 16, A = 13; tutorials H = 8, A = 4.
   - Tutorials off: 81.2% (81.25 truncated), met.
   - Tutorials on: 17/24 = 70.8%, not met.
6. **Split windows.** The midsem window is `[start, midsem]` and **includes the midsem date**. The endsem window starts the next day.
   - A class on the midsem date counts only in the midsem window. A class the day after counts only in the endsem window.
   - Example, with today in the endsem window:
     - Midsem: H = 24, A = 20, R = 0 → `Final 83.3% · meets 80%` (safe).
     - Endsem: H = 6, A = 4, R = 18 → cur 66.6%, K = 280, S = 2, N = 4, best 91.6% → `Attend next 4 to reach 80%` (warning).
     - The same marks in whole-semester mode: H = 30, A = 24, R = 18 → K = 360 → `Can skip 3 more` (safe).
   - A good midsem record does not carry over to endsem.
7. **Semester already ended.** With `T > end`, every window has R = 0 and shows a `Final …` headline. Example: H = 40, A = 31 gives `Final 77.5% · below 80%`. With U = 2, the card also shows "2 unmarked".
8. **Before the semester starts.** Every window has H = 0 (unless future marks exist) and R = all generated countable sessions.
9. **Past unmarked sessions** go into U only. They are not counted as present or absent (OQ-2).
10. **Future-dated marks** (planned absences or medical) count in H now.
11. **Makeup labs.** Example with T = 2026-10-21: 12 labs; 9 present, 1 absent with no makeup date, 1 medical with makeup date 2026-10-30, 1 cancelled.
    - Result: 9 done, 2 pending, warning. With T = 2026-10-31 the dated makeup is overdue, so the status is danger.
    - Completing one makeup gives 10 done, 1 pending.
    - Changing the lab to present removes its makeup.
    - Lecture percentages are unaffected throughout.
12. **A course with only labs** shows no percentage card, only the lab summary.
13. **A holiday added on a day that already has a mark.** That session is excluded and its mark is kept (§4.3 rule 4).
14. **Midnight in IST.** `2026-10-21T18:29:59Z` is still 2026-10-21. `18:30:00Z` is 2026-10-22.

### 4.5 Trip planner

**Input:** a date range `[from, to]`.

**Effective range:** `[max(from, T), min(to, semester.end)]`.

**Simulation.** For each course and window, let `m` be the number of countable sessions in the effective range that are unmarked and not cancelled. Run §4.4 on `H' = H + m`, `A' = A`, `R' = R − m`. Then:
- **Projected %** is `best'`.
- **Skips left after the trip** is `S'`.
- **Status and headline** come from the same rules as §4.4.4.
- A window is **affected** when `m > 0`.
- **Labs that would need makeups** are the unmarked, non-cancelled lab sessions in the effective range.
- Nothing is saved.

**Overall verdict:**
- **No-go** if any affected window has `K' < 0`.
- otherwise **Careful** if any affected window ends in warning or danger, or any lab would need a makeup.
- otherwise **Go**.

**Worked example** (AC-10, p = 80):

| Course | Before | m | After | Result |
|---|---|---|---|---|
| P (whole) | H 20, A 19, R 25 → S 8 | 3 | H 23, A 19, R 22 → K′ 500 | safe, `Can skip 5 more`, projected 91.1% |
| Q (split, endsem window) | H 10, A 9, R 15 → S 4 | 3 | H 13, A 9, R 12 → K′ 100, N 7 | warning, `Attend next 7 to reach 80%`, projected 84.0% |
| CS lab | — | 1 lab | — | 1 makeup needed |

- **Verdict: Careful.**
- If the range grows so that Q has m = 5: K′ = 1900 − 2000 = −100, projected 76.0%. Q shows `Can't recover in this window · best 76.0%`. **Verdict: No-go.**
- A range with no sessions: **Go**, shown as "No classes in this range".
- A range that crosses the midsem date counts `m` separately for each window of a split course.

### 4.6 Statistics

| Statistic | How it is computed |
|---|---|
| **Weekly trend** (per course) | For each week ending Sunday, from the first week with H > 0 up to `min(T, end)`: cumulative `cur` over all countable marked sessions dated ≤ that Sunday. Windows are ignored and the medical cap is applied. Weeks with H = 0 are skipped. The chart also draws a line at `p`. |
| **Most-skipped weekday** | The weekday with the most `absent` marks, across all courses and kinds. Ties go to the earliest weekday (Mon first). With no absences it shows "No skips yet". |
| **Streaks** | Walk the marked, non-cancelled sessions of all courses in `(date, start_time)` order. `present` adds 1. `absent` resets to 0. `medical` neither adds nor resets. *Current* is the value at the end; *longest* is the maximum reached. |

**Fixture (AC-12).** T = 2026-08-23. One course, p = 80, a daily lecture (sessions not listed are unmarked). The marks:
- Mon 2026-08-03 P
- Tue P
- Wed M
- Thu P
- Fri A
- Mon 08-10 P
- Tue C
- Wed A
- Thu A
- Fri 08-14 P

Expected results:
- Streaks: current 1, longest 3.
- Most-skipped weekday: **Wed** (Wed, Thu and Fri tie; earliest wins).
- Trend: [80.0, 66.6].

Adding Fri 08-21 A gives most-skipped **Fri** and trend [80.0, 66.6, 60.0].

### 4.7 CSV export

- **Filename:** `bunkometer-<semester-name-slug>-<T>.csv`
- **Encoding:** UTF-8, RFC 4180, CRLF line endings.
- **Quoting:**
  - A field that contains a comma, a quote, CR or LF is wrapped in quotes, with inner quotes doubled.
  - A field that starts with `=`, `+`, `-` or `@` gets a `'` prefix, so spreadsheets do not run it as a formula.
- **Header (exact):** `date,weekday,course_code,course_name,kind,start_time,duration_min,status,extra,window,counts,makeup_date,makeup_done`
- **Rows:**
  - Every session of the active semester dated `≤ T`, plus later-dated sessions that have a mark.
  - Sorted by date, then start time, then course code.
- **Values:**
  - `weekday` is Mon…Sun.
  - `status` is present / absent / medical / cancelled / unmarked.
  - `extra` is yes / no.
  - `window` is whole / midsem / endsem.
  - `counts` is yes if the session is countable.
  - The makeup fields are blank for non-labs.

### 4.8 Demo dataset (`/demo`)

**Demo date.** `DEMO_TODAY = 2026-10-21` (Wednesday). It is fixed, so the demo looks the same whenever it is opened (OQ-10).

**Semester.** "Aug–Dec 2026 (demo)": start 2026-08-03, midsem 2026-09-26, end 2026-11-28.

**No-class periods:**
- 2026-08-15 Independence Day
- 2026-09-21 → 2026-09-26 Midsem exams
- 2026-10-02 Gandhi Jayanti

**Seed rules.** The seed is deterministic, with no randomness. Every past session is marked. Today's sessions are unmarked so the visitor can tap them.

| Course | Window, p | Timetable (illustrative) | Target state on DEMO_TODAY |
|---|---|---|---|
| MA 211 Real Analysis | split, 80% | Lectures Mon / Wed / Fri 09:00; tutorial Thu 14:00 (counts) | Endsem window **safe**, S ≥ 6. Midsem window final, meets 80%. |
| PH 203 Electromagnetism | split, 80% | Lectures Tue / Thu 10:00 | Endsem window **danger**. Midsem window met, which shows the windows are independent. |
| CH 201 Physical Chemistry | whole, 75% | Lectures Mon / Wed 11:00; tutorial Fri 15:00 (tutorials **not** counted); medical cap 3 | **warning**; includes 2 medical marks |
| CS 201 Data Structures | whole, 80% | Lectures Tue / Thu 14:00; lab Wed 14:00 (180 min) | Lectures **safe**. **Exactly 1 pending makeup lab** with no date. 1 completed makeup. |
| HS 201 Economics | whole, 70% | Lectures Mon / Fri 16:00 | **safe**; includes 1 extra Saturday class and 1 cancelled class |

### 4.9 Screens and routes

**Bottom navigation** (5 tabs, icon + label): Today · Courses · Plan · History · Settings.

| Route | Auth | Content |
|---|---|---|
| `/` | public | Landing page with "Sign in with Google" and "Try the demo". Signed-in users are redirected to `/today`. |
| `/setup` | user | First semester wizard: dates → courses → timetable → holidays. Also offers "Import from a link". |
| `/today` | user | Pending-makeups banner and "N classes need marking" prompt. Today's sessions with 4-way controls and the course headline. "Add extra class". Empty states. |
| `/courses`, `/courses/[id]` | user | Course cards (§4.4.4) sorted by status. The detail page shows windows, the trend chart, sessions, makeups and rule editing. |
| `/plan` | user | Trip planner (§4.5) |
| `/history` | user | Month calendar, day editor, "Mark a range" (bulk), statistics, Export CSV |
| `/settings` | user | Semester, courses, timetable, no-class periods, share link (publish / copy / revoke), semester switcher, theme, sign out, delete account |
| `/share/[token]` | public | Read-only template preview with Import |
| `/privacy` | public | Privacy policy (R51), linked from the landing page footer and Settings |
| `/demo`, `/demo/{courses,plan,history,settings}` | public | Same screens using demo data |
| `/api/auth/*` | public | Auth.js |
| `/api/health` | public | `{"ok":true,"db":true}` |

**Design direction:**
- Dark theme by default: near-black background with raised cards and one accent colour.
- Large numbers for "Can skip N".
- Status chips: ✓ Safe (green), ! Warning (amber), ✕ Danger (red), – None (grey).
- Rounded cards and a fixed bottom navigation.
- System font stack or a font self-hosted through `next/font`. No external font requests.
- Respect `prefers-reduced-motion`.

---

## 5. Requirements

### A. Access and privacy
- **R1 (Must)** WHEN a signed-out visitor requests any route other than `/`, `/privacy`, `/demo/**`, `/share/**`, `/api/auth/**`, `/api/health` or static assets (manifest, service worker, icons), THE SYSTEM SHALL redirect to `/`, which offers "Sign in with Google" and "Try the demo".
- **R2 (Must)** WHEN a user completes Google sign-in, THE SYSTEM SHALL upsert a user record holding only the Google ID, email and name, and SHALL redirect to `/today`, or to `/setup` if the user has no semester. WHEN the user signs out, THE SYSTEM SHALL end the session and redirect to `/`.
- **R3 (Must)** THE SYSTEM SHALL scope every database read and write to records owned by the signed-in user. IF a request references a record that does not exist or belongs to another user THEN THE SYSTEM SHALL respond as not found (404) and change nothing.
- **R4 (Must)** THE SYSTEM SHALL access the database only from server code via `DATABASE_URL`, and no client-side bundle SHALL contain a database driver, connection string or secret.
- **R5 (Must)** WHERE `E2E_TEST_AUTH` equals `1` and `VERCEL` is unset, THE SYSTEM SHALL enable a test-only credentials sign-in (emails ending `@e2e.test`, no password) and SHALL honour an `e2e_today` cookie that overrides today. IF either condition is false THEN THE SYSTEM SHALL register neither.
- **R6 (Must)** WHEN a signed-in user confirms account deletion by typing `DELETE`, THE SYSTEM SHALL do all of the following:
  - delete the user and all their semesters, courses, slots, sessions, no-class periods and share links in one transaction;
  - sign them out and redirect to `/`;
  - treat any other session of that user as signed out on its next request.

### B. Semester setup
- **R7 (Must)** WHEN a signed-in user has no semester, THE SYSTEM SHALL show `/setup`, where the user can create one (name, start, end, and an optional midsem date with the hint "Only needed if a course counts attendance separately for midsem and endsem.") or import one from a share link.
- **R8 (Must)** IF a semester does not satisfy `start < end`, or has a midsem date that does not satisfy `start < midsem < end`, or spans more than 366 days, THEN THE SYSTEM SHALL refuse to save and show an inline error on the offending field.
- **R9 (Must)** WHEN a user adds a course, THE SYSTEM SHALL:
  - require a code (1–16 characters, unique in the semester) and a name (1–80 characters);
  - assign the next unused palette colour;
  - apply the preset rules (80%, tutorials count, no medical cap, whole-semester window);
  - let the user edit each rule per course (required % as an integer 0–100; window whole or split; tutorials on or off; medical cap empty or 0–99);
  - offer the split window only when the semester has a midsem date. Otherwise the split option is disabled, with a hint saying where to add the midsem date (setup step 1 or Settings → Semester), and saving a split course without one is refused.
- **R10 (Must)** WHEN a user adds a timetable slot (weekday, start time, duration 15–240 min, kind), THE SYSTEM SHALL generate sessions for it exactly as in §4.3.
- **R11 (Must)** WHEN a user adds, edits or removes a no-class period, THE SYSTEM SHALL exclude scheduled sessions on its dates from every screen and calculation, while keeping their stored marks so they return if the period is removed.
- **R12 (Should)** WHERE a slot has a valid-from and/or valid-to date, THE SYSTEM SHALL generate its sessions only within that range, to support timetable changes mid-semester.
- **R13 (Must)** IF a user deletes a course or slot that has marks THEN THE SYSTEM SHALL state how many marks will be deleted and require confirmation.
- **R14 (Should)** THE SYSTEM SHALL let a user keep several semesters, create or import another, and switch the active one. Every screen SHALL show only the active semester.

### C. Marking
- **R15 (Must)** WHEN a user opens Today, THE SYSTEM SHALL list today's sessions (scheduled and extra) by start time. Each SHALL show the course colour, code, name, kind, time range, one-tap Present / Absent / Medical / Cancelled controls, and the course's current-window headline.
- **R16 (Must)** WHEN a user taps a status, THE SYSTEM SHALL show it as selected immediately, persist it, and update every affected budget. WHEN the user taps the already-selected status, THE SYSTEM SHALL clear the mark.
- **R17 (Must)** IF today has no sessions THEN THE SYSTEM SHALL say why, using one of:
  - the covering no-class period's label;
  - `No classes today`;
  - `Semester starts <date>`;
  - `Semester ended <date>`, with a link to the final results.
- **R18 (Must)** WHEN a user adds an extra class (course, a date inside the semester, start time, duration, kind, optional status), THE SYSTEM SHALL treat it as a session in every calculation, even on weekends and no-class days, and SHALL allow editing and deleting it.
- **R19 (Must)** IF a user tries to mark a session dated after today as Present THEN THE SYSTEM SHALL refuse. Absent, Medical and Cancelled SHALL be allowed on future dates.
- **R20 (Should)** WHILE past sessions are unmarked, THE SYSTEM SHALL show `<N> classes need marking` on Today, linking to a list where each can be marked.
- **R21 (Must)** IF saving a mark or edit fails THEN THE SYSTEM SHALL restore the previous state and show an error with a Retry action.

### D. Calculation engine
- **R22 (Must)** THE SYSTEM SHALL compute H, A, R, U, cur, best, K, S and N exactly as §4.4.2–4.4.3 define them, using integer arithmetic for every comparison, with every session counting as one.
- **R23 (Must)** THE SYSTEM SHALL treat a requirement as met only when `100·A ≥ p·H` (no rounding up), and SHALL display percentages truncated, never rounded, to one decimal.
- **R24 (Must)** THE SYSTEM SHALL count Medical as attended and tag it as medical. WHERE a course has a medical cap, only the first `cap` medical sessions in date and time order across the semester SHALL count as attended; later ones SHALL count as absent and be flagged "over cap".
- **R25 (Must)** THE SYSTEM SHALL exclude cancelled sessions and all labs from H, A and R, and SHALL exclude tutorials when the course's "tutorials count" toggle is off.
- **R26 (Must)** WHERE a course uses split windows, THE SYSTEM SHALL compute every metric separately for the midsem window `[start, midsem]` and the endsem window `[midsem + 1 day, end]`, assigning each session to exactly one window by its date.
- **R27 (Must)** THE SYSTEM SHALL give each window exactly one status (none / safe / warning / danger) and one headline by the first matching rule of §4.4.4, and each lab summary a status by §4.4.5.
- **R28 (Must)** THE SYSTEM SHALL determine today on the server as the current date in Asia/Kolkata. The engine SHALL receive today as an input and SHALL never read the clock.

### E. Budgets and labs
- **R29 (Must)** WHEN a user opens Courses, THE SYSTEM SHALL show one card per course with:
  - status (text, icon and colour), headline, H, A (with the medical count), cur, R, best, and U when it is above 0;
  - for split courses, the current window first and the other window beneath it.
  
  Cards SHALL be sorted by overall status (danger, warning, safe, none), then by code.
- **R30 (Must)** WHEN a lab session is marked Absent or Medical, THE SYSTEM SHALL create a pending makeup, which the user can give a makeup date and mark completed. WHEN that lab is re-marked Present or Cancelled, or cleared, THE SYSTEM SHALL remove the makeup.
- **R31 (Must)** WHILE any makeup is pending, THE SYSTEM SHALL show a pending-makeups banner at the top of Today and a pending count on the course card, flagging overdue makeups as "overdue".

### F. Trip planner and bulk marking
- **R32 (Must)** WHEN a user picks a date range in Plan, THE SYSTEM SHALL simulate the trip as in §4.5 without saving anything. For each course and affected window it SHALL show classes missed, projected %, skips left after the trip and status, plus the labs that would need makeups. IF `from > to`, or the effective range is empty, THEN THE SYSTEM SHALL show a validation message instead of results.
- **R33 (Must)** WHEN a plan is computed, THE SYSTEM SHALL show one overall verdict (Go, Careful or No-go) by the rule in §4.5.
- **R34 (Must)** WHEN a user chooses "Mark a range" with a date range, a status (Absent or Medical) and courses (all by default), THE SYSTEM SHALL first preview how many sessions will be marked and how many existing marks will be overwritten. On confirmation it SHALL apply all changes in a single transaction.

### G. History, statistics and export
- **R35 (Must)** WHEN a user opens History, THE SYSTEM SHALL show a month calendar that marks days with sessions and distinguishes days with an absence and days with unmarked sessions. WHEN a day is tapped, THE SYSTEM SHALL open an editor for that day's sessions with the same controls as Today.
- **R36 (Should)** THE SYSTEM SHALL show, for each course, a weekly cumulative-% trend chart with a reference line at the required % (§4.6).
- **R37 (Should)** THE SYSTEM SHALL show the most-skipped weekday and the current and longest attendance streaks (§4.6).
- **R38 (Must)** WHEN a user taps Export CSV, THE SYSTEM SHALL download the active semester's sessions in the format of §4.7.

### H. Shared timetable
- **R39 (Must)** WHEN an owner publishes their semester, THE SYSTEM SHALL create a link `/share/<token>`, using a random token of at least 128 bits. The link's page SHALL show read-only semester dates, no-class periods, courses, rules and timetable, and SHALL show no attendance data and no owner name or email.
- **R40 (Must)** WHEN a signed-in user taps Import on a share page, THE SYSTEM SHALL create an independent copy with no marks as that user's new active semester. IF the visitor is signed out THEN THE SYSTEM SHALL offer Google sign-in and return to the share page afterwards.
- **R41 (Must)** WHEN an owner revokes the link, or deletes the semester or the account, THE SYSTEM SHALL make `/share/<token>` respond 404 with "This link is no longer active", leaving existing imports unchanged.

### I. Demo
- **R42 (Must)** WHEN anyone opens `/demo`, THE SYSTEM SHALL show the full app (Today, Courses, Plan, History, Settings) without sign-in. It SHALL be seeded with §4.8 at `DEMO_TODAY` and show a persistent "Demo" banner.
- **R43 (Must)** WHILE in demo mode, THE SYSTEM SHALL:
  - keep changes only in that browser's `localStorage`;
  - send no request that writes to the server or reads the database;
  - disable sharing and account actions;
  - offer "Reset demo".

### J. Design and platform
- **R44 (Must)** THE SYSTEM SHALL use the dark theme by default and offer Dark, Light and System. The choice SHALL be remembered on the device and applied before first paint, with no flash of the wrong theme.
- **R45 (Must)** THE SYSTEM SHALL work at 360 px width without horizontal scrolling. It SHALL have a fixed bottom navigation with five tabs, and marking controls and navigation items SHALL be at least 44×44 CSS px.
- **R46 (Must)** THE SYSTEM SHALL meet WCAG 2.1 AA colour contrast in both themes, and SHALL never convey status by colour alone.
- **R47 (Should)** THE SYSTEM SHALL be an installable PWA:
  - a manifest with name, short name, 192 px, 512 px and maskable icons, `display: standalone`, `start_url: /today` and theme colours;
  - a service worker that caches the app shell.
  
  IF the device is offline THEN THE SYSTEM SHALL show an offline notice and disable marking.

### K. Operations
- **R48 (Must)** THE SYSTEM SHALL expose `GET /api/health`. It SHALL return 200 `{"ok":true,"db":true}` when a query on the `users` table succeeds, and 503 `{"ok":false,"db":false}` otherwise, with no other detail.
- **R49 (Must)** WHEN commits are pushed or a pull request is opened, CI on `ubuntu-24.04` SHALL run lint, typecheck and unit tests, and fail on any error.
- **R50 (Must)** THE SYSTEM SHALL be deployed on a Vercel production URL where `/demo`, Google sign-in and database access all work.
- **R51 (Must)** THE SYSTEM SHALL serve a public privacy policy at `/privacy`, linked from the landing page footer and from Settings, which states:
  - what is stored: name, email, Google ID and the user's attendance data;
  - that nothing is shared or sold, and there are no ads or tracking;
  - how to delete the account and all data;
  - a contact email.

  Google requires this URL, and the homepage URL, to publish the OAuth consent screen (D2).
- **R52 (Must)** IF a user removes the semester's midsem date while any course uses split windows THEN THE SYSTEM SHALL refuse the change and show an inline message naming those courses and asking to switch them to whole semester first. Semesters that already have a midsem date, the demo, and every formula are unchanged.

---

## 6. Acceptance criteria

E2E tests run against a production build with test sign-in. Each test sets `e2e_today` to a fixed date, builds its own fixture semester, and deletes its user at the end. "Engine-computed" means the test gets the expected value by calling the engine on the fixture (the UI wiring is what is under test; the engine itself is proven by the Unit ACs).

### Unit (Vitest)
- **AC-1** [Unit] (R22, R27) Each row E1–E13 of §4.4.6 produces exactly the listed H, A, R, cur, best, K, S, N, status and headline string.
- **AC-2** [Unit] (R22, R23) A brute-force sweep over every H 0–30, A 0–H, R 0–30 and p ∈ {0, 50, 75, 80, 85, 100} confirms three things:
  - `met ⇔ 100·A ≥ p·H`.
  - S equals the largest k ≤ R with `100·(A+R−k) ≥ p·(H+R)`, and is "—" when even k = 0 fails.
  - When the window is not met but reachable, N equals the smallest n ≤ R with `100·(A+n) ≥ p·(H+n)`.
- **AC-3** [Unit] (R23) Percentage formatting:
  - `pct(399,499)` = `79.9%`, and it is not met at 80.
  - `pct(39,49)` = `79.5%`.
  - `pct(4,5)` = `80.0%`, and it is met at 80.
  - `pct(0,0)` = `—`.
  - In the AC-2 sweep, every K, S and N value passes `Number.isInteger`.
- **AC-4** [Unit] (R24) Edge case 4 numbers:
  - No cap gives A = 17. Cap 2 gives A = 16 (met, one session flagged "over cap"). Cap 1 gives A = 15 (not met).
  - With medical marks in both windows of a split course, the cap is used up in date order across both windows.
- **AC-5** [Unit] (R25) Edge cases 3 and 5 numbers:
  - Cancelled sessions change neither H nor R.
  - A present extra class adds 1 to H and to A.
  - Tutorials off gives 81.2% (met). Tutorials on gives 70.8% (not met).
  - Adding or marking lab sessions never changes any window metric.
- **AC-6** [Unit] (R26) Edge case 6 numbers:
  - An extra class on the midsem date (2026-09-26) is counted in the midsem window only. One on 2026-09-27 is counted in endsem only.
  - The midsem window gives `Final 83.3% · meets 80%`. The endsem window gives `Attend next 4 to reach 80%` with S = 2.
  - The same data in whole mode gives `Can skip 3 more`.
- **AC-7** [Unit] (R22, R27) Edge cases 7–10:
  - T after the end gives R = 0 and a `Final …` headline for every window.
  - T before the start gives H = 0 and R = all generated countable sessions.
  - Past unmarked sessions are counted in U, not in H or R.
  - Future-dated marks are counted in H.
- **AC-8** [Unit] (R10, R11, R12) The §4.3 fixture gives exactly the listed dates and counts (16 / 15 / 16 / 12). A stored mark on 2026-10-19 is ignored while that day is a holiday and is counted again after the holiday is removed.
- **AC-9** [Unit] (R28) The IST date function:
  - `todayIST(2026-10-21T18:29:59Z)` = `2026-10-21`.
  - `todayIST(2026-10-21T18:30:00Z)` = `2026-10-22`.
  - A test fails if any file in `src/lib/engine/` contains `Date.now(` or `new Date()`.
- **AC-10** [Unit] (R32, R33) The §4.5 example gives exactly the listed m, projected %, S′, statuses, headlines and verdicts (Careful, then No-go). A range partly before today is clipped to today. A range crossing the midsem date splits m per window. A range with no sessions gives Go.
- **AC-11** [Unit] (R30, R31) Lab lifecycle:
  - absent → pending;
  - makeup date set → still pending;
  - completed → not pending;
  - re-marked present → no makeup;
  - pending with a makeup date before today → overdue.
  
  The lab status follows §4.4.5, and the edge case 11 counts match.
- **AC-12** [Unit] (R36, R37) The §4.6 fixture gives exactly the listed trend values, most-skipped weekday (Wed, then Fri after the extra absence) and streaks (current 1, longest 3).
- **AC-13** [Unit] (R38) CSV:
  - The header line matches §4.7 exactly.
  - The course name `Lab, "Advanced"` is written as `"Lab, ""Advanced"""`.
  - A name starting with `=` gets a `'` prefix.
  - Rows are sorted by date, then time, then code. Lines end in CRLF.
  - The filename matches `bunkometer-<slug>-<YYYY-MM-DD>.csv`.
- **AC-14** [Unit] (R5) The auth configuration factory:
  - (`E2E_TEST_AUTH=1`, `VERCEL` unset) gives providers `google` and `test-login`, and `e2e_today` is honoured.
  - (`E2E_TEST_AUTH=1`, `VERCEL=1`) gives `google` only, and the cookie is ignored.
  - (`E2E_TEST_AUTH` unset) gives `google` only.
- **AC-15** [Unit] (R8, R9, R19) Validators reject:
  - midsem equal to start or to end, and a 367-day span;
  - a duplicate course code (case-insensitive), a required % of 101 or 79.5, a medical cap of 100;
  - slot durations of 14 and 241;
  - Present on a date after today. Absent, Medical and Cancelled on that date are accepted.
  
  New-course defaults equal the preset in R9.
- **AC-16** [Unit] (R42) The demo seed at `DEMO_TODAY` has:
  - at least 1 split and at least 1 whole course;
  - exactly one course in danger in its current window;
  - at least one course safe with S ≥ 6;
  - exactly 1 pending makeup lab;
  - U = 0 for every course;
  - at least 3 unmarked sessions today, including a lab;
  - the exact states listed in §4.8.
- **AC-17** [Unit] (R48) The health handler returns exactly 200 `{"ok":true,"db":true}` when the DB check succeeds, and 503 `{"ok":false,"db":false}` when it throws.
- **AC-46** [Unit] (R22, R27) "Can't recover in this window" (decision OQ-6):
  - E4, E11 and E14 each give status danger and exactly `Can't recover in this window · best {best}`, with E14 showing `best 68.7%`.
  - In the AC-2 sweep, every case with `R > 0` and `K < 0` gives that headline, and `best` equals `floor(1000·(A+R)/(H+R))/10`.
  - A window with `R = 0` that is not met gives `Final … · below …` instead.

### E2E (Playwright)
- **AC-18** [E2E] (R1) Signed out:
  - `/today`, `/courses`, `/plan`, `/history` and `/settings` each redirect to `/`.
  - `/` shows "Sign in with Google" and "Try the demo".
  - `/demo`, `/share/<valid token>` and `/api/health` do not redirect.
- **AC-19** [E2E] (R2, R7, R10) A new test user:
  - lands on `/setup`;
  - creates a semester, 2 courses and 3 slots;
  - reaches `/today` showing exactly the slots for `e2e_today`'s weekday;
  - signs out and lands on `/`.
- **AC-20** [E2E] (R15, R16) On Today, tapping Absent on a lecture:
  - shows Absent as selected;
  - still shows it after a reload;
  - makes that course's headline on Courses equal the engine-computed value.
  
  Tapping Absent again clears the mark, and it is still cleared after a reload.
- **AC-21** [E2E] (R17, R20) Empty states and the unmarked prompt:
  - With `e2e_today` on a no-class day, Today shows that period's label.
  - Before the start it shows `Semester starts …`. After the end it shows `Semester ended …`.
  - With 2 past sessions unmarked it shows `2 classes need marking`. Marking both removes the prompt.
- **AC-22** [E2E] (R18, R19) An extra class added on a Sunday appears in that day's list, and marking it Present raises the course's H by 1 on Courses. On a future date, the Present control is disabled.
- **AC-23** [E2E] (R21) With the save request aborted (via Playwright routing), tapping Present shows an error with Retry, and the control returns to its previous state.
- **AC-24** [E2E] (R11, R13) Holidays and deletion:
  - Adding a holiday on a day with a marked session removes that session from Today, from History and from H.
  - Removing the holiday restores the mark.
  - Deleting a course with 3 marks shows "3 marks will be deleted". Cancelling keeps the course.
- **AC-25** [E2E] (R29, R26) For a fixture with a split-window course, Courses shows:
  - the current window first and the other window below;
  - a status text label on every card;
  - the danger card above the safe card.
- **AC-26** [E2E] (R30, R31) Marking a lab Absent shows "1 pending makeup" on Today and a pending count on the course card. Setting a makeup date keeps both. Marking the makeup completed removes both.
- **AC-27** [E2E] (R32, R33) In Plan:
  - The fixture range shows the engine-computed missed counts and the verdict "Careful".
  - A widened range shows "No-go".
  - `from > to` shows a validation message and no verdict.
  - Afterwards, Courses shows the same figures as before.
- **AC-28** [E2E] (R34) Bulk-marking a 3-day range as Medical previews the engine-computed totals ("N sessions, K overwritten"). After confirming, every session in that range shows Medical in History.
- **AC-29** [E2E] (R35) History shows markers on days with sessions. Tapping a past day and changing a mark updates that course's figures on Courses.
- **AC-30** [E2E] (R38) Export CSV downloads a file named `bunkometer-*.csv`. Its first line equals the §4.7 header and its row count equals the fixture's expected count.
- **AC-31** [E2E] (R39, R40, R41) Sharing:
  - User A publishes a link.
  - A signed-out browser sees A's courses and timetable, but not A's name, email or any mark.
  - User B imports the link and sees the same courses with H = 0 everywhere.
  - A revokes the link, and it then shows the 404 "This link is no longer active" page.
  - B's semester still exists.
- **AC-32** [E2E] (R3) Isolation:
  - User B opening `/courses/<A's course id>` gets 404.
  - User B calling the mark action with A's course and slot IDs gets an error.
  - A's mark is unchanged when checked as A.
- **AC-33** [E2E] (R6, R41) After deleting the account by typing `DELETE`:
  - the browser ends on `/`;
  - signing in again with the same test email lands on `/setup`;
  - A's former share link returns 404.
- **AC-34** [E2E] (R14) Creating and switching to a second semester makes Today and Courses show only its data. Switching back restores the first semester's data.
- **AC-35** [E2E] (R42, R43) In a browser with no cookies or storage, `/demo`:
  - shows the Demo banner and `Wed, 21 Oct`;
  - on Courses, shows exactly one Danger card and "1 pending makeup";
  - keeps a mark made in the demo after a reload;
  - restores the seed on "Reset demo".
  
  The test's network log contains no POST requests.
- **AC-36** [E2E] (R44) Theme:
  - With no stored preference, `<html data-theme="dark">` is set even when the browser is emulated to a light colour scheme.
  - Choosing Light survives a reload.
  - Choosing System follows the emulated colour scheme.
  - The theme attribute is set by an inline `<head>` script present in the server HTML.
- **AC-37** [E2E] (R45) At a 360×740 viewport, on `/today`, `/courses`, `/plan`, `/history`, `/settings` and `/demo`:
  - `document.documentElement.scrollWidth ≤ 360`;
  - the bottom navigation is visible with 5 links;
  - every marking control and navigation link has a bounding box of at least 44×44.
- **AC-38** [E2E] (R46) `@axe-core/playwright` runs on `/`, `/today`, `/courses`, `/plan`, `/history`, `/settings`, `/share/<token>` and `/demo`, in both themes. It reports 0 `color-contrast` violations and 0 serious or critical violations. Every status chip contains non-empty text.
- **AC-39** [E2E] (R47) PWA:
  - `/manifest.webmanifest` has the required fields, and its 192, 512 and maskable icons return 200.
  - `navigator.serviceWorker.ready` resolves.
  - After going offline and reloading `/today`, an offline notice shows and the marking controls are disabled.
- **AC-40** [E2E] (R4) No JavaScript file loaded by any page in the E2E suite contains `postgres://`, `postgresql://`, `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET` or `@neondatabase`.

- **AC-47** [E2E] (R51, R1) Privacy policy:
  - signed out, `/privacy` returns 200 without a redirect;
  - it names what is stored (name, email, Google ID, attendance data), says nothing is shared or sold and there are no ads or tracking, and explains deleting the account in Settings;
  - it has a contact email line;
  - the landing page footer link "Privacy" opens it;
  - Settings (signed in and in the demo) links to it;
  - the page passes the AC-38 axe audit in both themes.

- **AC-48** [Unit] (R8, R9, R52) Optional midsem date:
  - a semester with no midsem date is valid, and end must still be after start;
  - a given midsem date is still checked;
  - a split course is refused without a midsem date and accepted with one, both in Settings and in a new semester;
  - removing the midsem date is refused while a split course exists, with a message naming it, and allowed otherwise;
  - whole-semester results are identical with or without a midsem date;
  - existing split semesters keep both windows.
- **AC-49** [E2E] (R7, R8, R9, R52) Optional midsem date in the app:
  - setup shows the midsem hint and finishes without a midsem date;
  - in that semester, the split option is disabled with its hint, both in setup and in Settings → Add course;
  - in a semester with a split course, clearing the midsem date in Settings shows the blocking message, and after a reload the date is unchanged;
  - existing split windows still show on Courses.

### Deploy
- **AC-41** [Deploy] (R48, R50) On the production URL:
  - `GET /api/health` returns 200 `{"ok":true,"db":true}`;
  - `GET /demo` returns 200 without signing in.
- **AC-42** [Deploy] (R5) On the production URL, `GET /api/auth/providers` lists only `google`.
- **AC-43** [Deploy] (R49) The latest GitHub Actions run on `main` is green, with lint, typecheck and unit-test steps on `ubuntu-24.04`.

### Manual
- **AC-44** [Manual] (R2, R50) On a phone, at the production URL:
  - sign in with a real Google account, create a course and mark Present;
  - sign in on a second device and see the same mark;
  - also sign in with a Google account that is not a developer account (for example, the professor's), and confirm it works.
- **AC-45** [Manual] (R47) On Android Chrome, the browser offers to install the app, and the installed app opens standalone at `/today`.

### Traceability

| R | ACs | R | ACs | R | ACs |
|---|---|---|---|---|---|
| R1 | 18, 47 | R18 | 22 | R35 | 29 |
| R2 | 19, 44 | R19 | 15, 22 | R36 | 12 |
| R3 | 32 | R20 | 21 | R37 | 12 |
| R4 | 40 | R21 | 23 | R38 | 13, 30 |
| R5 | 14, 42 | R22 | 1, 2, 7, 46 | R39 | 31 |
| R6 | 33 | R23 | 2, 3 | R40 | 31 |
| R7 | 19, 49 | R24 | 4 | R41 | 31, 33 |
| R8 | 15, 48, 49 | R25 | 5 | R42 | 16, 35, 41 |
| R9 | 15, 48, 49 | R26 | 6, 25 | R43 | 35 |
| R10 | 8, 19 | R27 | 1, 7, 46 | R44 | 36 |
| R11 | 8, 24 | R28 | 9 | R45 | 37 |
| R12 | 8 | R29 | 25 | R46 | 38 |
| R13 | 24 | R30 | 11, 26 | R47 | 39, 45 |
| R14 | 34 | R31 | 11, 26 | R48 | 17, 41 |
| R15 | 20 | R32 | 10, 27 | R49 | 43 |
| R16 | 20 | R33 | 10, 27 | R50 | 41, 44 |
| R17 | 21 | R34 | 28 | R51 | 47 |
| | | | | R52 | 48, 49 |

The phase each AC belongs to, its status and its evidence are tracked in the AC table in [PLAN.md](PLAN.md).

---

## 7. Phase-1 deployment risks

Phase 1 deploys the walking skeleton before any features are built, so these risks are found on day one.

**Owner setup checklist** (done by the owner; the builder only gives instructions):
1. Google Cloud: create an OAuth client and configure the consent screen.
2. Neon: create a project with a `main` branch (production) and a `dev` branch (local and E2E).
3. Vercel: import the repository and set the 4 environment variables. `DATABASE_URL` is the `main` URL for **Production** and the `dev` URL for **Preview**. The three `AUTH_*` variables apply to both. Do not install Neon's Vercel integration, because it creates a branch per preview.
4. Fill in `.env.local` locally with the `dev` URL.

| ID | Risk | Symptom | Prevention | Verified by |
|---|---|---|---|---|
| D1 | Google redirect URI not registered for the production domain | `Error 400: redirect_uri_mismatch` | Add `https://<project>.vercel.app/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google` as Authorized redirect URIs, and the matching JavaScript origins. Repeat if a custom domain is added. | AC-44 |
| D2 | OAuth consent screen left in "Testing" mode | Users not on the test list see "Access blocked", including the professor | Set the app to **In production**; Google asks for a homepage URL (`/`) and a privacy policy URL (`/privacy`, R51). It requests only `openid email profile`, which are non-sensitive scopes and need no verification. Interim fallback: add the professor's account as a test user. `/demo` needs no login. | AC-44 |
| D3 | Vercel preview URLs change on every deploy and Google does not allow wildcards | Sign-in fails on preview deployments | Accepted. Sign-in is supported only on production and localhost. Previews use the `dev` branch and serve `/demo` and `/api/health`. | — |
| D4 | Auth environment variables missing in Vercel, or added after the last deploy | Auth.js `MissingSecret` or `Configuration` error page | Set `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` with Production scope before the first deploy. Redeploy after any change, because variables only apply to new deployments. | AC-41, AC-44 |
| D5 | Wrong host or URL detection | Callback goes to the wrong host, or `UntrustedHost` locally under `next start` | Do not set `AUTH_URL` on Vercel. Set `trustHost: true` in the Auth.js config, because local production-mode E2E needs it. | AC-19, AC-44 |
| D6 | Neon connection problems on serverless | Timeouts or "too many connections" | Use Neon's **pooled** connection string (`-pooler` host, `sslmode=require`) with the `@neondatabase/serverless` HTTP driver. Create the client lazily, never at import time. | AC-41 |
| D7 | Neon free tier scales to zero when idle | The first request after idle is slow (around 1 s or more) | Accepted. Pages show loading skeletons. The health check allows a 10 s timeout. | AC-41 |
| D8 | Vercel function region far from the database region | Every query crosses continents, so pages are slow | The Neon project is in AWS US East 1 (N. Virginia, `us-east-1`), so keep Vercel's default function region `iad1` (Washington, D.C.), which sits next to it. Users in India pay one long round trip per page, not one per query. | AC-41 (latency noted) |
| D9 | Migrations not applied, or applied to the wrong branch | 500 errors: `relation "users" does not exist`, or production schema changed by a preview | A `vercel-build` script runs `drizzle-kit migrate` and then `next build`, against that environment's own `DATABASE_URL` (Production → `main`, Preview → `dev`). Locally, `npm run db:migrate` targets `dev` via `.env.local`. Migrations are additive only. `/api/health` queries `users`, so a missing migration fails the check. | AC-41 |
| D10 | DB or auth code runs at build time or in edge middleware | `next build` fails in CI or on Vercel, or edge runtime errors | Mark DB-backed pages as dynamic. Keep an edge-safe `auth.config.ts` for middleware/proxy, with no DB import. CI builds without secrets. | AC-43 |
| D11 | A secret leaks into the client bundle | A key is visible in the JavaScript | Never use a `NEXT_PUBLIC_` prefix for secrets. Import the DB only in `server-only` modules. | AC-40 |
| D12 | Test login accidentally enabled in production | Anyone can sign in as a test user | The provider is registered only when `E2E_TEST_AUTH=1` and `VERCEL` is unset. `E2E_TEST_AUTH` is never added in Vercel. | AC-14, AC-42 |

## 8. Output files

This session produces only `SPEC.md`. The build will produce the files below. The layout is proposed; names may change, but the engine stays pure and separate.

```
SPEC.md                      this document (kept up to date; changelog below)
PLAN.md                      build phases, [AUTO]/[HUMAN] tasks, AC status and evidence table
README.md                    what it is, live URL, /demo link, local setup, env var names, scripts, testing, deploy steps
.env.example                 DATABASE_URL=, AUTH_SECRET=, AUTH_GOOGLE_ID=, AUTH_GOOGLE_SECRET=, E2E_TEST_AUTH=
.nvmrc, package.json, package-lock.json, tsconfig.json, next.config.ts, eslint config,
postcss/tailwind config, vitest.config.ts, playwright.config.ts, drizzle.config.ts
.github/workflows/ci.yml     lint, typecheck, unit tests on ubuntu-24.04
drizzle/                     SQL migrations
src/app/                     routes from §4.9 (incl. manifest.ts, api/health, api/auth/[...nextauth])
src/components/              UI (bottom nav, mark control, course card, calendar, charts)
src/lib/engine/              pure: dates.ts, sessions.ts, budget.ts, trip.ts, stats.ts, csv.ts
src/lib/db/                  schema.ts, client.ts (server-only), queries scoped by user
src/lib/auth/                auth.ts, auth.config.ts (edge-safe), providers.ts
src/lib/demo/                seed.ts, local store
public/                      icons (192, 512, maskable), sw.js
tests/unit/                  Vitest specs (AC-1 … AC-17)
e2e/                         Playwright specs (AC-18 … AC-40) + fixtures/helpers
```

## 9. Non-goals (v1)

- Push, email or SMS notifications and reminders.
- Native Android or iOS apps. The PWA is the mobile app.
- Any AI or LLM feature.
- Syncing with or scraping the college's official attendance or ERP system. Importing timetables from PDF or images.
- Offline marking and background sync. Offline only shows a notice.
- Real-time collaboration. Templates are read-only copies.
- Admin or teacher dashboards, or class-wide attendance.
- Rules beyond §4.4, such as grace marks, condonation, or percentages weighted by duration.
- Internationalisation and time zones other than IST.
- Rate limiting and abuse protection beyond authentication and ownership checks.

## 10. Risks and fallbacks

| Risk | Fallback |
|---|---|
| The build runs past 1–2 days | Cut the Should items in this order: R36 trend → R37 stats → R14 multiple semesters → R12 slot validity → R20 unmarked prompt → R47 service worker (keep the manifest). The Must ACs are never cut. |
| Google sign-in fails for the evaluator (D1, D2, D4) | `/demo` shows every feature without login. The README gives the demo link first. |
| Mistakes in the maths | The engine is written first and is pure. AC-1 uses hand-computed examples. The AC-2 brute force compares against the definition by enumeration. |
| Bugs at the date or time-zone boundary | Use date strings only, IST only, and a server-supplied today. AC-9 tests the midnight boundary. |
| Flaky E2E tests against a real database | Separate Neon `dev` branch. Unique user per test file. Serial workers. A fixed `e2e_today`. Clean up through account deletion. |
| Auth.js v5 or Next.js API churn | Pin exact versions. Keep the auth code in `src/lib/auth/` only. |
| Neon cold starts or free-tier limits | The data is tiny. Show skeleton loaders. Retry one failed read once. |
| Data loss from deleting a slot or course | A confirmation shows how many marks will be lost (R13). |
| Tampered server-action payloads | zod validation plus ownership checks on every action (R3, AC-32). |
| The demo seed drifts from its targets | Fixed `DEMO_TODAY` and the AC-16 assertions. |

## 11. Open questions: all decided (v0.2)

All twelve proposed defaults were accepted on 2026-10-22. OQ-6 and OQ-11 have additions. No open questions remain.

| # | Question | Decision |
|---|---|---|
| OQ-1 | Which window does a class on the midsem date belong to? | The midsem window (inclusive). Endsem starts the next day. |
| OQ-2 | How should past sessions left unmarked be treated? | Exclude them from all maths and flag them as "N classes need marking". Do not assume present or absent. |
| OQ-3 | What form does the medical cap take? | A count of sessions, per course, across the whole semester. The earliest medical sessions count first. |
| OQ-4 | Does a lab missed on medical grounds still need a makeup? | Yes. Absent and Medical labs both create a makeup. |
| OQ-5 | What window does a new course use by default? | Whole semester. Split is one toggle away. |
| OQ-6 | When does a course turn amber or red? | **Amber:** only 1–2 skips left, or currently below the requirement but still recoverable. **Red:** 0 skips left. **Addition:** when even attending every remaining class in the window can't reach the requirement, the card is red and shows `Can't recover in this window · best X%`, where X is the best achievable % (§4.4.4 rule c, E14, AC-46). |
| OQ-7 | Can the required % have decimals (e.g. 75.5%)? | No. Whole numbers 0–100 only. |
| OQ-8 | Do future-dated marks (planned absences or medical) count as held now? | Yes, so the budget already reflects them. |
| OQ-9 | Is a share link a snapshot or live? | The link shows the owner's *current* timetable. Each import is a frozen, independent copy. |
| OQ-10 | Should the demo use a fixed date or follow the real date? | Fixed at Wed 21 Oct 2026, so it looks the same whenever it is opened. |
| OQ-11 | Which ORM, how are migrations run, and which database does each environment use? | Drizzle ORM with drizzle-kit SQL migrations, run by `vercel-build` against that environment's own `DATABASE_URL`. **Addition:** Preview deployments and E2E runs (and local development) use the Neon `dev` branch only. Only Production uses `main` (C11, D9). |
| OQ-12 | Should the professor be able to sign in with their own Google account? | Yes. Publish the consent screen "In production" (basic scopes need no verification). `/demo` is the fallback. |

## 12. Changelog

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-10-22 | Initial draft |
| v0.2 | 2026-10-22 | Accepted OQ-1–OQ-12 as decisions. OQ-6: rule c headline is now `Can't recover in this window · best X%`; added E14 and AC-46. OQ-11: Preview, local and E2E use the Neon `dev` branch, only Production uses `main`; migrations run per environment (C11, D9, owner checklist). Phase breakdown and AC phases moved to PLAN.md (C12, §6). |
| v0.3 | 2026-10-22 | Region correction: the Neon project is in AWS US East 1, so Vercel keeps its default function region `iad1` (D8). No requirement or AC changed. |
| v0.4 | 2026-10-22 | Added R51 (Must): public `/privacy` page linked from the landing footer and Settings, needed to publish the Google OAuth consent screen; AC-47 (E2E); R1, §4.9 and D2 updated. |
| v0.5 | 2026-10-26 | The midsem date is optional and only needed for split windows. Changes: §4.1 and §4.2 (`midsem_date` nullable, check relaxed), R7, R8 and R9 updated, new R52 (removing the midsem date is blocked while split courses exist), AC-48 (Unit) and AC-49 (E2E) added. Existing semesters, the demo and the maths are unchanged. |
