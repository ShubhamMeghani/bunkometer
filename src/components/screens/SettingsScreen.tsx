"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { marksForCourse, marksForSlot } from "@/lib/data/mutations";
import { COURSE_DEFAULTS, nextColour } from "@/lib/data/schemas";
import { formatDayShort } from "@/lib/engine/dates";
import type { Course, NoClassPeriod, Slot } from "@/lib/engine/types";
import { KIND_LABEL, WEEKDAY_NAMES, plural, timeRange } from "@/lib/ui/format";
import { useData } from "../data/DataProvider";
import { clearPageCache } from "../ServiceWorker";
import { ThemeToggle } from "../Theme";
import { CourseForm, PeriodForm, SemesterForm, SlotForm } from "../forms";
import { Card, ColourDot, ConfirmSheet, PageHeader, Sheet, btn, inputClass } from "../ui";

const PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000000";

type Editing =
  | { kind: "course"; course: Course; isNew: boolean }
  | { kind: "slot"; slot: Slot; isNew: boolean }
  | { kind: "period"; period: NoClassPeriod; isNew: boolean }
  | null;

type Deleting =
  | { kind: "course"; id: string; label: string; marks: number }
  | { kind: "slot"; id: string; label: string; marks: number }
  | { kind: "period"; id: string; label: string; marks: 0 }
  | null;

export interface AccountActions {
  switchSemester: (id: string) => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: (confirmation: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

/** Semester, courses, timetable, no-class periods, semesters and account (SPEC R6, R9–R14). */
export function SettingsScreen({ account, extra }: { account?: AccountActions; extra?: React.ReactNode }) {
  const { snapshot, semesters, run, mode } = useData();
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Deleting>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [switchTo, setSwitchTo] = useState(snapshot.semester.id);
  const { semester, courses, slots, periods } = snapshot;
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const newCourse = (): Course => ({
    id: PLACEHOLDER_ID,
    code: "",
    name: "",
    colour: nextColour(courses.map((c) => c.colour)),
    sortOrder: courses.length,
    ...COURSE_DEFAULTS,
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle={snapshot.semester.name} />

      <section className="space-y-2" aria-labelledby="sem-h">
        <h2 id="sem-h" className="text-lg font-bold">
          Semester
        </h2>
        <Card>
          <SemesterForm
            key={`${semester.id}-${semester.startDate}-${semester.midsemDate}-${semester.endDate}-${semester.name}`}
            initial={semester}
            submitLabel="Save semester"
            onSubmit={(s) => run({ type: "saveSemester", semester: s })}
          />
        </Card>
        {mode === "server" && account && (
          <Card className="space-y-2">
            <label className="block text-sm font-semibold" htmlFor="switch-sem">
              Active semester
            </label>
            <div className="flex gap-2">
              <select id="switch-sem" className={inputClass} value={switchTo} onChange={(e) => setSwitchTo(e.target.value)}>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={btn.secondary}
                disabled={switchTo === semester.id}
                onClick={async () => {
                  const res = await account.switchSemester(switchTo);
                  if (res.ok) router.refresh();
                }}
              >
                Switch
              </button>
            </div>
            <Link href="/setup" className={btn.ghost}>
              + New semester
            </Link>
          </Card>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="courses-h">
        <div className="flex items-center justify-between">
          <h2 id="courses-h" className="text-lg font-bold">
            Courses
          </h2>
          <button type="button" className={btn.ghost} onClick={() => setEditing({ kind: "course", course: newCourse(), isNew: true })}>
            + Add course
          </button>
        </div>
        <ul className="space-y-2">
          {courses.map((c) => (
            <li key={c.id} data-testid="settings-course" data-course={c.code}>
              <Card className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ColourDot colour={c.colour} />
                    <span className="whitespace-nowrap font-bold">{c.code}</span>
                    <span className="truncate text-sm text-muted">{c.name}</span>
                  </div>
                  <div className="flex shrink-0">
                    <button type="button" className={btn.ghost} onClick={() => setEditing({ kind: "course", course: c, isNew: false })}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="min-h-11 px-2 font-semibold text-danger"
                      onClick={() => setDeleting({ kind: "course", id: c.id, label: c.code, marks: marksForCourse(snapshot, c.id) })}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <ul className="space-y-1">
                  {slots
                    .filter((s) => s.courseId === c.id)
                    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime))
                    .map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 text-sm" data-testid="slot">
                        <span>
                          {WEEKDAY_NAMES[s.weekday - 1].slice(0, 3)} {timeRange(s.startTime, s.durationMin)} · {KIND_LABEL[s.kind]}
                          {s.validFrom || s.validTo ? ` · ${s.validFrom ?? "start"}→${s.validTo ?? "end"}` : ""}
                        </span>
                        <span className="flex">
                          <button type="button" className="min-h-11 px-2 font-semibold text-accent" onClick={() => setEditing({ kind: "slot", slot: s, isNew: false })}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="min-h-11 px-2 font-semibold text-danger"
                            aria-label={`Delete ${WEEKDAY_NAMES[s.weekday - 1]} ${s.startTime} slot`}
                            onClick={() =>
                              setDeleting({
                                kind: "slot",
                                id: s.id,
                                label: `${c.code} ${WEEKDAY_NAMES[s.weekday - 1]} ${s.startTime}`,
                                marks: marksForSlot(snapshot, s.id),
                              })
                            }
                          >
                            ✕
                          </button>
                        </span>
                      </li>
                    ))}
                </ul>
                <button
                  type="button"
                  className={btn.ghost}
                  onClick={() =>
                    setEditing({
                      kind: "slot",
                      isNew: true,
                      slot: { id: PLACEHOLDER_ID, courseId: c.id, weekday: 1, startTime: "09:00", durationMin: 60, kind: "lecture", validFrom: null, validTo: null },
                    })
                  }
                >
                  + Add slot
                </button>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2" aria-labelledby="periods-h">
        <div className="flex items-center justify-between">
          <h2 id="periods-h" className="text-lg font-bold">
            Holidays &amp; exams
          </h2>
          <button
            type="button"
            className={btn.ghost}
            onClick={() =>
              setEditing({ kind: "period", isNew: true, period: { id: PLACEHOLDER_ID, label: "", startDate: "", endDate: "", kind: "holiday" } })
            }
          >
            + Add period
          </button>
        </div>
        <Card>
          {periods.length === 0 ? (
            <p className="text-sm text-muted">No holidays or exams added.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {periods.map((p) => (
                <li key={p.id} className="flex min-h-11 items-center justify-between gap-2 text-sm" data-testid="period">
                  <span>
                    <span className="font-semibold">{p.label}</span>{" "}
                    <span className="text-muted">
                      {formatDayShort(p.startDate)}
                      {p.endDate !== p.startDate ? ` – ${formatDayShort(p.endDate)}` : ""}
                    </span>
                  </span>
                  <span className="flex">
                    <button type="button" className="min-h-11 px-2 font-semibold text-accent" onClick={() => setEditing({ kind: "period", period: p, isNew: false })}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="min-h-11 px-2 font-semibold text-danger"
                      aria-label={`Delete ${p.label}`}
                      onClick={() => setDeleting({ kind: "period", id: p.id, label: p.label, marks: 0 })}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="space-y-2" aria-labelledby="look-h">
        <h2 id="look-h" className="text-lg font-bold">
          Appearance
        </h2>
        <Card>
          <ThemeToggle />
        </Card>
      </section>

      {extra}

      {mode === "server" && account && (
        <section className="space-y-2" aria-labelledby="account-h">
          <h2 id="account-h" className="text-lg font-bold">
            Account
          </h2>
          <Card className="flex flex-wrap gap-2">
            <form action={account.signOut} onSubmit={() => void clearPageCache()}>
              <button type="submit" className={btn.secondary}>
                Sign out
              </button>
            </form>
            <button type="button" className={btn.danger} onClick={() => setDeleteAccountOpen(true)}>
              Delete account
            </button>
          </Card>
        </section>
      )}

      <p className="text-sm">
        <Link href="/privacy" className="inline-flex min-h-11 items-center font-semibold text-accent">
          Privacy policy
        </Link>
      </p>

      <Sheet
        open={editing !== null}
        title={
          editing?.kind === "course"
            ? editing.isNew
              ? "Add course"
              : `Edit ${editing.course.code}`
            : editing?.kind === "slot"
              ? editing.isNew
                ? `Add slot · ${courseById.get(editing.slot.courseId)?.code ?? ""}`
                : "Edit slot"
              : editing?.isNew
                ? "Add holiday or exams"
                : "Edit period"
        }
        onClose={() => setEditing(null)}
      >
        {editing?.kind === "course" && (
          <CourseForm
            initial={editing.course}
            submitLabel={editing.isNew ? "Add course" : "Save course"}
            onSubmit={async (c) => {
              const ok = await run({ type: "saveCourse", course: editing.isNew ? { ...c, id: crypto.randomUUID() } : c });
              if (ok) setEditing(null);
              return ok;
            }}
          />
        )}
        {editing?.kind === "slot" && (
          <SlotForm
            initial={editing.slot}
            courses={[courseById.get(editing.slot.courseId)!].filter(Boolean)}
            submitLabel={editing.isNew ? "Add slot" : "Save slot"}
            onSubmit={async (s) => {
              const ok = await run({ type: "saveSlot", slot: editing.isNew ? { ...s, id: crypto.randomUUID() } : s });
              if (ok) setEditing(null);
              return ok;
            }}
          />
        )}
        {editing?.kind === "period" && (
          <PeriodForm
            initial={editing.period}
            submitLabel={editing.isNew ? "Add period" : "Save period"}
            onSubmit={async (p) => {
              const ok = await run({ type: "savePeriod", period: editing.isNew ? { ...p, id: crypto.randomUUID() } : p });
              if (ok) setEditing(null);
              return ok;
            }}
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={deleting !== null}
        title={`Delete ${deleting?.label ?? ""}?`}
        message={
          deleting && deleting.marks > 0 ? (
            <p>
              <strong>{plural(deleting.marks, "mark")} will be deleted.</strong> This can&apos;t be undone.
            </p>
          ) : (
            <p>This can&apos;t be undone.</p>
          )
        }
        confirmLabel="Delete"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          if (deleting.kind === "course") void run({ type: "deleteCourse", courseId: deleting.id });
          if (deleting.kind === "slot") void run({ type: "deleteSlot", slotId: deleting.id });
          if (deleting.kind === "period") void run({ type: "deletePeriod", periodId: deleting.id });
          setDeleting(null);
        }}
      />

      {account && (
        <Sheet open={deleteAccountOpen} title="Delete account" onClose={() => setDeleteAccountOpen(false)}>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              await clearPageCache();
              const res = await account.deleteAccount(confirmText);
              if (!res.ok) setAccountError(res.error ?? "Couldn't delete the account");
            }}
          >
            <p>This permanently deletes your account, every semester, course and mark, and your share links.</p>
            <label className="block text-sm font-semibold" htmlFor="confirm-delete">
              Type DELETE to confirm
            </label>
            <input id="confirm-delete" className={inputClass} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
            {accountError && (
              <p role="alert" className="text-sm font-medium text-danger">
                {accountError}
              </p>
            )}
            <button type="submit" className={`${btn.danger} w-full`} disabled={confirmText !== "DELETE"}>
              Delete my account
            </button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
