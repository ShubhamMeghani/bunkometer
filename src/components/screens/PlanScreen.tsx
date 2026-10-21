"use client";

import { useState } from "react";
import { addDays, formatDayShort } from "@/lib/engine/dates";
import { planTrip, type Verdict } from "@/lib/engine/trip";
import { plural } from "@/lib/ui/format";
import { useData } from "../data/DataProvider";
import { Card, ColourDot, Field, StatusChip, inputClass } from "../ui";

const VERDICT: Record<Verdict, { label: string; text: string; cls: string; icon: string }> = {
  go: { label: "Go", text: "Every course stays safe.", cls: "bg-safe-bg text-safe", icon: "✓" },
  careful: { label: "Careful", text: "You can still pass everything, but it gets tight.", cls: "bg-warn-bg text-warn", icon: "!" },
  nogo: { label: "No-go", text: "At least one course could no longer reach its requirement.", cls: "bg-danger-bg text-danger", icon: "✕" },
};

/** Trip planner: what-if, nothing is saved (SPEC R32, R33). */
export function PlanScreen() {
  const { snapshot, sessions, today } = useData();
  const start = today < snapshot.semester.startDate ? snapshot.semester.startDate : today;
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(addDays(start, 2));
  const plan = from && to ? planTrip(snapshot.semester, snapshot.courses, sessions, today, from, to) : null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Plan a trip</h1>
        <p className="text-muted">See what missing these days would do. Nothing is saved.</p>
      </header>
      <Card className="grid grid-cols-2 gap-2">
        <Field label="From">
          {(p) => <input {...p} type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />}
        </Field>
        <Field label="To">
          {(p) => <input {...p} type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />}
        </Field>
      </Card>

      {plan && !plan.ok && (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 font-semibold text-danger" data-testid="plan-error">
          {plan.error}
        </p>
      )}

      {plan?.ok && (
        <>
          <section className={`rounded-2xl p-4 ${VERDICT[plan.verdict].cls}`} data-testid="verdict" data-verdict={plan.verdict}>
            <p className="text-2xl font-bold">
              <span aria-hidden="true">{VERDICT[plan.verdict].icon} </span>
              {VERDICT[plan.verdict].label}
            </p>
            <p className="font-medium">
              {plan.affected.length === 0 ? "No classes in this range." : VERDICT[plan.verdict].text}
            </p>
            <p className="mt-1 text-sm">
              {formatDayShort(plan.from)} – {formatDayShort(plan.to)}
              {plan.clipped ? " (dates outside today → semester end are ignored)" : ""}
            </p>
          </section>

          <ul className="space-y-3">
            {plan.affected.map((c) => (
              <li key={c.course.id} data-testid="trip-course" data-course={c.course.code}>
                <Card className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ColourDot colour={c.course.colour} />
                      <span className="font-bold">{c.course.code}</span>
                      <span className="text-sm text-muted">{plural(c.missed, "class", "classes")} missed</span>
                    </div>
                    <StatusChip status={c.status} />
                  </div>
                  {c.windows.map((w) => (
                    <div key={w.before.window.id} className="rounded-xl bg-surface-2 p-3 text-sm" data-testid="trip-window">
                      {c.course.windowMode === "split" && <p className="text-xs font-semibold uppercase text-muted">{w.before.window.label}</p>}
                      <p className="font-bold">{w.after.headline}</p>
                      <p className="text-muted">
                        Miss {w.missed} · now {w.before.cur} → projected {w.after.best} ·{" "}
                        {w.after.S === null ? "no skips possible" : `${plural(w.after.S, "skip")} left after`}
                      </p>
                    </div>
                  ))}
                  {c.labs.length > 0 && (
                    <p className="text-sm font-semibold text-warn">
                      {plural(c.labs.length, "lab")} would need a makeup: {c.labs.map((l) => formatDayShort(l.date)).join(", ")}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
          {plan.unaffected.length > 0 && (
            <p className="text-sm text-muted">Not affected: {plan.unaffected.map((c) => c.code).join(", ")}</p>
          )}
        </>
      )}
    </div>
  );
}
