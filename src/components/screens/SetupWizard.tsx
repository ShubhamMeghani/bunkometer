"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COURSE_DEFAULTS, nextColour, type NewSemester } from "@/lib/data/schemas";
import { midsemRemovalBlock, validateNewSemester } from "@/lib/data/mutations";
import { formatDayShort } from "@/lib/engine/dates";
import type { Course, NoClassPeriod, Slot } from "@/lib/engine/types";
import { KIND_LABEL, WEEKDAY_NAMES, timeRange } from "@/lib/ui/format";
import { CourseForm, PeriodForm, SemesterForm, SlotForm, type SemesterFields } from "../forms";
import { Card, ColourDot, btn } from "../ui";

const PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000000";
const STEPS = ["Dates", "Courses", "Timetable", "Holidays"] as const;

/** First-semester wizard: dates → courses → timetable → holidays (SPEC R7–R11). */
export function SetupWizard({
  createSemester,
  canCancel,
  importSlot,
}: {
  createSemester: (input: NewSemester) => Promise<{ ok: boolean; error?: string }>;
  canCancel: boolean;
  importSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [semester, setSemester] = useState<SemesterFields>({ name: "", startDate: "", midsemDate: null, endDate: "" });
  const [courses, setCourses] = useState<Course[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [periods, setPeriods] = useState<NoClassPeriod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const newCourse: Course = {
    id: PLACEHOLDER_ID,
    code: "",
    name: "",
    colour: nextColour(courses.map((c) => c.colour)),
    sortOrder: courses.length,
    ...COURSE_DEFAULTS,
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Set up your semester</h1>
        <ol className="flex gap-2 text-xs font-semibold text-muted" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className={i === step ? "text-accent" : ""}>
              {i + 1}. {s}
            </li>
          ))}
        </ol>
      </header>

      {step === 0 && (
        <>
          <Card>
            <SemesterForm
              check={(s) => {
                const block = s.midsemDate === null ? midsemRemovalBlock(courses) : null;
                return block ? { field: "midsemDate", message: block } : null;
              }}
              initial={semester}
              submitLabel="Next"
              onSubmit={(s) => {
                setSemester(s);
                setStep(1);
                return true;
              }}
            />
          </Card>
          {importSlot}
          {canCancel && (
            <Link href="/today" className={btn.ghost}>
              Cancel
            </Link>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <Card className="space-y-3">
            <h2 className="font-bold">Add your courses</h2>
            <CourseForm
              key={courses.length}
              splitHint={semester.midsemDate ? undefined : "Add a midsem date in step 1 (Dates) to use split windows."}
              initial={newCourse}
              submitLabel="Add course"
              onSubmit={(c) => {
                const clash = courses.some((o) => o.code.toLowerCase() === c.code.toLowerCase());
                if (clash) {
                  setError(`Two courses use the code ${c.code}`);
                  return false;
                }
                setError(null);
                setCourses([...courses, { ...c, id: crypto.randomUUID() }]);
                return true;
              }}
            />
          </Card>
          <ItemList
            empty="No courses yet."
            items={courses.map((c) => ({
              key: c.id,
              label: (
                <>
                  <ColourDot colour={c.colour} /> <strong>{c.code}</strong> {c.name} · {c.requiredPct}% ·{" "}
                  {c.windowMode === "split" ? "split" : "whole"}
                </>
              ),
              onRemove: () => {
                setCourses(courses.filter((x) => x.id !== c.id));
                setSlots(slots.filter((s) => s.courseId !== c.id));
              },
            }))}
          />
          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={courses.length === 0} />
        </>
      )}

      {step === 2 && (
        <>
          <Card className="space-y-3">
            <h2 className="font-bold">Weekly timetable</h2>
            <SlotForm
              key={`${slots.length}-${courses.length}`}
              initial={{ id: PLACEHOLDER_ID, courseId: courses[0].id, weekday: 1, startTime: "09:00", durationMin: 60, kind: "lecture", validFrom: null, validTo: null }}
              courses={courses}
              submitLabel="Add slot"
              onSubmit={(s) => {
                setSlots([...slots, { ...s, id: crypto.randomUUID() }]);
                return true;
              }}
            />
          </Card>
          <ItemList
            empty="No slots yet."
            items={slots.map((s) => {
              const c = courses.find((x) => x.id === s.courseId)!;
              return {
                key: s.id,
                label: (
                  <>
                    <strong>{c.code}</strong> {WEEKDAY_NAMES[s.weekday - 1].slice(0, 3)} {timeRange(s.startTime, s.durationMin)} ·{" "}
                    {KIND_LABEL[s.kind]}
                  </>
                ),
                onRemove: () => setSlots(slots.filter((x) => x.id !== s.id)),
              };
            })}
          />
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </>
      )}

      {step === 3 && (
        <>
          <Card className="space-y-3">
            <h2 className="font-bold">Holidays &amp; exams (optional)</h2>
            <PeriodForm
              key={periods.length}
              initial={{ id: PLACEHOLDER_ID, label: "", startDate: "", endDate: "", kind: "holiday" }}
              submitLabel="Add period"
              onSubmit={(p) => {
                setPeriods([...periods, { ...p, id: crypto.randomUUID() }]);
                return true;
              }}
            />
          </Card>
          <ItemList
            empty="No holidays or exams yet."
            items={periods.map((p) => ({
              key: p.id,
              label: (
                <>
                  <strong>{p.label}</strong> {formatDayShort(p.startDate)}
                  {p.endDate !== p.startDate ? ` – ${formatDayShort(p.endDate)}` : ""}
                </>
              ),
              onRemove: () => setPeriods(periods.filter((x) => x.id !== p.id)),
            }))}
          />
          <div className="flex gap-2">
            <button type="button" className={btn.secondary} onClick={() => setStep(2)}>
              Back
            </button>
            <button
              type="button"
              className={`${btn.primary} flex-1`}
              disabled={busy}
              onClick={async () => {
                const input: NewSemester = { semester, courses, slots, periods };
                const cross = validateNewSemester(input);
                if (cross) return setError(cross);
                setBusy(true);
                const res = await createSemester(input);
                setBusy(false);
                if (!res.ok) return setError(res.error ?? "Couldn't save");
                router.push("/today");
                router.refresh();
              }}
            >
              Finish setup
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function ItemList({ items, empty }: { items: { key: string; label: React.ReactNode; onRemove: () => void }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-1" data-testid="wizard-items">
      {items.map((i) => (
        <li key={i.key} className="flex min-h-11 items-center justify-between gap-2 rounded-xl bg-surface px-3 text-sm">
          <span className="flex items-center gap-1">{i.label}</span>
          <button type="button" className="min-h-11 px-2 font-semibold text-danger" onClick={i.onRemove}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

function Nav({ onBack, onNext, nextDisabled }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="flex gap-2">
      <button type="button" className={btn.secondary} onClick={onBack}>
        Back
      </button>
      <button type="button" className={`${btn.primary} flex-1`} onClick={onNext} disabled={nextDisabled}>
        Next
      </button>
    </div>
  );
}
