"use client";

import Link from "next/link";
import type { BudgetStatus } from "@/lib/engine/types";
import { CourseCard } from "../attendance";
import { useData } from "../data/DataProvider";
import { EmptyState, PageHeader, StatusChip, btn } from "../ui";

const ORDER: BudgetStatus[] = ["danger", "warning", "safe"];
const SUMMARY_LABEL: Record<BudgetStatus, string> = { danger: "in danger", warning: "to watch", safe: "safe", none: "no classes" };

/** SPEC R29: one card per course, danger first, with a one-line overview on top. */
export function CoursesScreen() {
  const { summaries, snapshot, href } = useData();
  const counts = ORDER.map((st) => [st, summaries.filter((s) => s.status === st).length] as const).filter(([, n]) => n > 0);
  return (
    <div className="space-y-4">
      <PageHeader title="Courses" subtitle={snapshot.semester.name} />
      {counts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {counts.map(([st, n]) => (
            <StatusChip key={st} status={st} label={`${n} ${SUMMARY_LABEL[st]}`} />
          ))}
        </div>
      )}
      {summaries.length === 0 ? (
        <EmptyState icon="📚" title="No courses yet" hint="Add your courses and weekly timetable to see your bunk budget.">
          <Link href={href("/settings")} className={btn.primary}>
            Add courses in Settings
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {summaries.map((s, i) => (
            <CourseCard key={s.course.id} summary={s} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}
