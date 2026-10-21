"use client";

import { useState } from "react";
import { bulkPreview } from "@/lib/engine/bulk";
import { plural } from "@/lib/ui/format";
import { useData } from "./data/DataProvider";
import { ColourDot, Field, Sheet, btn, inputClass } from "./ui";

/** "Mark a range": preview, then one transaction (SPEC R34). */
export function BulkMark() {
  const { snapshot, sessions, today, run, online } = useData();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState<"absent" | "medical">("medical");
  const [chosen, setChosen] = useState<string[]>(() => snapshot.courses.map((c) => c.id));
  const preview = from && to && from <= to ? bulkPreview(sessions, from, to, chosen, status) : null;
  const error = !from || !to ? "Pick both dates" : from > to ? "Start date must be on or before end date" : chosen.length === 0 ? "Pick at least one course" : null;

  return (
    <>
      <button type="button" className={btn.secondary} onClick={() => setOpen(true)} disabled={!online}>
        Mark a range
      </button>
      <Sheet open={open} title="Mark a range" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              {(p) => <input {...p} type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />}
            </Field>
            <Field label="To">
              {(p) => <input {...p} type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />}
            </Field>
          </div>
          <fieldset className="space-y-1">
            <legend className="text-sm font-semibold">Mark as</legend>
            <div className="flex gap-2">
              {(["medical", "absent"] as const).map((s) => (
                <label key={s} className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 font-semibold">
                  <input type="radio" name="bulk-status" checked={status === s} onChange={() => setStatus(s)} className="size-5 accent-[var(--accent)]" />
                  {s === "medical" ? "Medical" : "Absent"}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-sm font-semibold">Courses</legend>
            {snapshot.courses.map((c) => (
              <label key={c.id} className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--accent)]"
                  checked={chosen.includes(c.id)}
                  onChange={(e) => setChosen(e.target.checked ? [...chosen, c.id] : chosen.filter((x) => x !== c.id))}
                />
                <ColourDot colour={c.colour} /> {c.code}
              </label>
            ))}
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : (
            preview && (
              <p className="rounded-xl bg-surface-2 p-3 font-semibold" data-testid="bulk-preview">
                {plural(preview.sessions, "session")} will be marked {status === "medical" ? "Medical" : "Absent"}
                {preview.overwritten > 0 ? ` (${plural(preview.overwritten, "existing mark")} overwritten)` : ""}.
              </p>
            )
          )}
          <button
            type="button"
            className={`${btn.primary} w-full`}
            disabled={error !== null || !preview || preview.sessions === 0}
            onClick={async () => {
              const ok = await run({ type: "bulkMark", from, to, status, courseIds: chosen });
              if (ok) setOpen(false);
            }}
          >
            {preview ? `Mark ${plural(preview.sessions, "session")}` : "Mark"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
