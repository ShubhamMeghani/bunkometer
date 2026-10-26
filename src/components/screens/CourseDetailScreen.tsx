"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDayShort } from "@/lib/engine/dates";
import { weeklyTrend } from "@/lib/engine/stats";
import { KIND_LABEL, STATUS_LABEL, timeRange } from "@/lib/ui/format";
import { MakeupList, WindowBlock } from "../attendance";
import { useData } from "../data/DataProvider";
import { CourseForm } from "../forms";
import { TrendChart } from "../TrendChart";
import { Card, ColourDot, ConfirmSheet, Sheet, StatusChip, btn } from "../ui";

const RECENT = 12;

export function CourseDetailScreen({ courseId, children }: { courseId: string; children?: React.ReactNode }) {
  const { summaries, today, href, run, snapshot } = useData();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteExtra, setDeleteExtra] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const summary = summaries.find((s) => s.course.id === courseId);
  if (!summary) {
    return (
      <Card>
        <p>This course no longer exists.</p>
        <Link href={href("/courses")} className={btn.ghost}>
          Back to courses
        </Link>
      </Card>
    );
  }
  const { course, windows, lab, hasPercentage } = summary;
  const history = summary.sessions.filter((s) => s.date <= today || s.status !== null).reverse();

  return (
    <div className="space-y-4">
      <Link href={href("/courses")} className="text-sm font-semibold text-accent">
        ← Courses
      </Link>
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ColourDot colour={course.colour} className="size-4" />
            <h1 className="text-3xl font-bold tracking-tight">{course.code}</h1>
          </div>
          <p className="text-muted">{course.name}</p>
        </div>
        <StatusChip status={summary.status} />
      </header>

      {hasPercentage &&
        windows.map((w) => (
          <Card key={w.window.id}>
            <WindowBlock budget={w} showLabel />
          </Card>
        ))}

      {hasPercentage && (
        <Card>
          <TrendChart points={weeklyTrend(course, summary.sessions, snapshot.semester, today)} requiredPct={course.requiredPct} />
        </Card>
      )}

      {children}

      {lab.status !== "none" && (
        <Card className="space-y-3" >
          <h2 className="font-bold" id="makeups">
            Labs
          </h2>
          <p className="text-sm text-muted">
            {lab.done} done · {lab.pending} pending · {lab.upcoming} upcoming
          </p>
          <MakeupList courseId={course.id} />
        </Card>
      )}

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Rules</h2>
          <button type="button" className={btn.ghost} onClick={() => setEditOpen(true)}>
            Edit course
          </button>
        </div>
        <p className="text-sm text-muted">
          Needs {course.requiredPct}% · {course.windowMode === "split" ? "midsem and endsem windows" : "whole semester"} ·
          tutorials {course.countTutorials ? "count" : "don't count"} · medical cap{" "}
          {course.medicalCap === null ? "none" : course.medicalCap}
        </p>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-bold">Sessions</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">No sessions yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {(showAll ? history : history.slice(0, RECENT)).map((s) => (
              <li key={s.key} className="flex min-h-11 items-center justify-between gap-2 py-1.5 text-sm">
                <span>
                  <span className="font-semibold">{formatDayShort(s.date)}</span>{" "}
                  <span className="text-muted">
                    {timeRange(s.startTime, s.durationMin)} · {KIND_LABEL[s.kind]}
                    {s.isExtra ? " · Extra" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{s.status ? STATUS_LABEL[s.status] : "Unmarked"}</span>
                  {s.isExtra && s.rowId && (
                    <button type="button" className="min-h-11 px-2 font-semibold text-danger" onClick={() => setDeleteExtra(s.rowId)}>
                      Delete
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {history.length > RECENT && (
          <button type="button" className={`${btn.ghost} w-full`} aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show recent only" : `Show all ${history.length} sessions`}
          </button>
        )}
      </Card>

      <Sheet open={editOpen} title={`Edit ${course.code}`} onClose={() => setEditOpen(false)}>
        <CourseForm
          initial={course}
          submitLabel="Save course"
          onSubmit={async (c) => {
            const ok = await run({ type: "saveCourse", course: c });
            if (ok) setEditOpen(false);
            return ok;
          }}
        />
      </Sheet>
      <ConfirmSheet
        open={deleteExtra !== null}
        title="Delete extra class?"
        message="This extra class and its mark will be removed."
        confirmLabel="Delete"
        onClose={() => setDeleteExtra(null)}
        onConfirm={() => {
          if (deleteExtra) void run({ type: "deleteExtra", rowId: deleteExtra });
          setDeleteExtra(null);
        }}
      />
    </div>
  );
}
