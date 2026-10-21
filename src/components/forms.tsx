"use client";

import { useState } from "react";
import {
  COLOURS,
  courseSchema,
  extraSchema,
  fieldErrors,
  periodSchema,
  semesterSchema,
  slotSchema,
} from "@/lib/data/schemas";
import type { Course, Kind, NoClassPeriod, Semester, Slot, Status } from "@/lib/engine/types";
import { KIND_LABEL, STATUS_LABEL, WEEKDAY_NAMES } from "@/lib/ui/format";
import { Field, btn, inputClass } from "./ui";

type Submit<T> = (value: T) => boolean | Promise<boolean>;

function num(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function useSubmit<T>(onSubmit: Submit<T>) {
  const [busy, setBusy] = useState(false);
  return {
    busy,
    async submit(value: T) {
      setBusy(true);
      try {
        return await onSubmit(value);
      } finally {
        setBusy(false);
      }
    },
  };
}

export type SemesterFields = Pick<Semester, "name" | "startDate" | "midsemDate" | "endDate">;

export function SemesterForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: SemesterFields;
  submitLabel: string;
  onSubmit: Submit<SemesterFields>;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, submit } = useSubmit(onSubmit);
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = semesterSchema.safeParse(v);
        if (!r.success) return setErrors(fieldErrors(r.error));
        setErrors({});
        await submit(r.data);
      }}
    >
      <Field label="Semester name" error={errors.name}>
        {(p) => <input {...p} className={inputClass} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}
      </Field>
      <Field label="Start date" error={errors.startDate}>
        {(p) => <input {...p} type="date" className={inputClass} value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value })} />}
      </Field>
      <Field label="Midsem date" error={errors.midsemDate} hint="The midsem window includes this date.">
        {(p) => <input {...p} type="date" className={inputClass} value={v.midsemDate} onChange={(e) => setV({ ...v, midsemDate: e.target.value })} />}
      </Field>
      <Field label="End date" error={errors.endDate}>
        {(p) => <input {...p} type="date" className={inputClass} value={v.endDate} onChange={(e) => setV({ ...v, endDate: e.target.value })} />}
      </Field>
      <button type="submit" className={`${btn.primary} w-full`} disabled={busy}>
        {submitLabel}
      </button>
    </form>
  );
}

export function CourseForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: Course;
  submitLabel: string;
  onSubmit: Submit<Course>;
}) {
  const [v, setV] = useState({
    code: initial.code,
    name: initial.name,
    colour: initial.colour,
    requiredPct: String(initial.requiredPct),
    countTutorials: initial.countTutorials,
    medicalCap: initial.medicalCap === null ? "" : String(initial.medicalCap),
    windowMode: initial.windowMode,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, submit } = useSubmit(onSubmit);
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = courseSchema.safeParse({
          ...initial,
          code: v.code,
          name: v.name,
          colour: v.colour,
          requiredPct: num(v.requiredPct),
          countTutorials: v.countTutorials,
          medicalCap: v.medicalCap.trim() === "" ? null : num(v.medicalCap),
          windowMode: v.windowMode,
        });
        if (!r.success) return setErrors(fieldErrors(r.error));
        setErrors({});
        await submit(r.data);
      }}
    >
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <Field label="Course code" error={errors.code}>
          {(p) => <input {...p} className={inputClass} placeholder="MA 211" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value })} />}
        </Field>
        <Field label="Course name" error={errors.name}>
          {(p) => <input {...p} className={inputClass} placeholder="Real Analysis" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Required %" error={errors.requiredPct}>
          {(p) => <input {...p} inputMode="numeric" className={inputClass} value={v.requiredPct} onChange={(e) => setV({ ...v, requiredPct: e.target.value })} />}
        </Field>
        <Field label="Medical cap" error={errors.medicalCap} hint="Blank = no cap">
          {(p) => <input {...p} inputMode="numeric" className={inputClass} value={v.medicalCap} onChange={(e) => setV({ ...v, medicalCap: e.target.value })} />}
        </Field>
      </div>
      <Field label="Evaluation window">
        {(p) => (
          <select {...p} className={inputClass} value={v.windowMode} onChange={(e) => setV({ ...v, windowMode: e.target.value as Course["windowMode"] })}>
            <option value="whole">Whole semester</option>
            <option value="split">Split: midsem + endsem</option>
          </select>
        )}
      </Field>
      <Field label="Colour">
        {(p) => (
          <select {...p} className={inputClass} value={v.colour} onChange={(e) => setV({ ...v, colour: e.target.value })}>
            {COLOURS.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={v.countTutorials} onChange={(e) => setV({ ...v, countTutorials: e.target.checked })} />
        Tutorials count toward the percentage
      </label>
      <button type="submit" className={`${btn.primary} w-full`} disabled={busy}>
        {submitLabel}
      </button>
    </form>
  );
}

export function SlotForm({
  initial,
  courses,
  submitLabel,
  onSubmit,
}: {
  initial: Slot;
  courses: Course[];
  submitLabel: string;
  onSubmit: Submit<Slot>;
}) {
  const [v, setV] = useState({
    courseId: initial.courseId,
    weekday: String(initial.weekday),
    startTime: initial.startTime,
    durationMin: String(initial.durationMin),
    kind: initial.kind,
    validFrom: initial.validFrom ?? "",
    validTo: initial.validTo ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, submit } = useSubmit(onSubmit);
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = slotSchema.safeParse({
          id: initial.id,
          courseId: v.courseId,
          weekday: Number(v.weekday),
          startTime: v.startTime,
          durationMin: num(v.durationMin),
          kind: v.kind,
          validFrom: v.validFrom || null,
          validTo: v.validTo || null,
        });
        if (!r.success) return setErrors(fieldErrors(r.error));
        setErrors({});
        await submit(r.data);
      }}
    >
      {courses.length > 1 && (
        <Field label="Course" error={errors.courseId}>
          {(p) => (
            <select {...p} className={inputClass} value={v.courseId} onChange={(e) => setV({ ...v, courseId: e.target.value })}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Day">
          {(p) => (
            <select {...p} className={inputClass} value={v.weekday} onChange={(e) => setV({ ...v, weekday: e.target.value })}>
              {WEEKDAY_NAMES.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Type">
          {(p) => (
            <select
              {...p}
              className={inputClass}
              value={v.kind}
              onChange={(e) => {
                const kind = e.target.value as Kind;
                setV({ ...v, kind, durationMin: kind === "lab" && v.durationMin === "60" ? "180" : v.durationMin });
              }}
            >
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start time" error={errors.startTime}>
          {(p) => <input {...p} type="time" className={inputClass} value={v.startTime} onChange={(e) => setV({ ...v, startTime: e.target.value })} />}
        </Field>
        <Field label="Duration (min)" error={errors.durationMin}>
          {(p) => <input {...p} inputMode="numeric" className={inputClass} value={v.durationMin} onChange={(e) => setV({ ...v, durationMin: e.target.value })} />}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Valid from" hint="Optional">
          {(p) => <input {...p} type="date" className={inputClass} value={v.validFrom} onChange={(e) => setV({ ...v, validFrom: e.target.value })} />}
        </Field>
        <Field label="Valid to" error={errors.validTo} hint="Optional">
          {(p) => <input {...p} type="date" className={inputClass} value={v.validTo} onChange={(e) => setV({ ...v, validTo: e.target.value })} />}
        </Field>
      </div>
      <button type="submit" className={`${btn.primary} w-full`} disabled={busy}>
        {submitLabel}
      </button>
    </form>
  );
}

export function PeriodForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: NoClassPeriod;
  submitLabel: string;
  onSubmit: Submit<NoClassPeriod>;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, submit } = useSubmit(onSubmit);
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = periodSchema.safeParse(v);
        if (!r.success) return setErrors(fieldErrors(r.error));
        setErrors({});
        await submit(r.data);
      }}
    >
      <Field label="Label" error={errors.label}>
        {(p) => <input {...p} className={inputClass} placeholder="Diwali break" value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} />}
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From" error={errors.startDate}>
          {(p) => <input {...p} type="date" className={inputClass} value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value, endDate: v.endDate || e.target.value })} />}
        </Field>
        <Field label="To" error={errors.endDate}>
          {(p) => <input {...p} type="date" className={inputClass} value={v.endDate} onChange={(e) => setV({ ...v, endDate: e.target.value })} />}
        </Field>
      </div>
      <Field label="Kind">
        {(p) => (
          <select {...p} className={inputClass} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as NoClassPeriod["kind"] })}>
            <option value="holiday">Holiday</option>
            <option value="exam">Exams</option>
            <option value="other">Other</option>
          </select>
        )}
      </Field>
      <button type="submit" className={`${btn.primary} w-full`} disabled={busy}>
        {submitLabel}
      </button>
    </form>
  );
}

export interface ExtraFields {
  id: string;
  courseId: string;
  date: string;
  startTime: string;
  durationMin: number;
  kind: Kind;
  status: Status | null;
}

export function ExtraClassForm({
  initial,
  courses,
  today,
  submitLabel,
  onSubmit,
}: {
  initial: ExtraFields;
  courses: Course[];
  today: string;
  submitLabel: string;
  onSubmit: Submit<ExtraFields>;
}) {
  const [v, setV] = useState({ ...initial, durationMin: String(initial.durationMin), status: initial.status ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, submit } = useSubmit(onSubmit);
  const future = v.date > today;
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = extraSchema.safeParse({ ...v, durationMin: num(v.durationMin), status: v.status || null });
        if (!r.success) return setErrors(fieldErrors(r.error));
        setErrors({});
        await submit(r.data);
      }}
    >
      <Field label="Course">
        {(p) => (
          <select {...p} className={inputClass} value={v.courseId} onChange={(e) => setV({ ...v, courseId: e.target.value })}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Date" error={errors.date}>
          {(p) => <input {...p} type="date" className={inputClass} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />}
        </Field>
        <Field label="Start time" error={errors.startTime}>
          {(p) => <input {...p} type="time" className={inputClass} value={v.startTime} onChange={(e) => setV({ ...v, startTime: e.target.value })} />}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Duration (min)" error={errors.durationMin}>
          {(p) => <input {...p} inputMode="numeric" className={inputClass} value={v.durationMin} onChange={(e) => setV({ ...v, durationMin: e.target.value })} />}
        </Field>
        <Field label="Type">
          {(p) => (
            <select {...p} className={inputClass} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as Kind })}>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field label="Mark as">
        {(p) => (
          <select {...p} className={inputClass} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as Status | "" })}>
            <option value="">Not marked yet</option>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <option key={s} value={s} disabled={s === "present" && future}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <button type="submit" className={`${btn.primary} w-full`} disabled={busy}>
        {submitLabel}
      </button>
    </form>
  );
}
