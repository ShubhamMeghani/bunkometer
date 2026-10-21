"use client";

import Link from "next/link";
import { CourseCard } from "../attendance";
import { useData } from "../data/DataProvider";
import { Card, btn } from "../ui";

/** SPEC R29: one card per course, danger first. */
export function CoursesScreen() {
  const { summaries, snapshot, href } = useData();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Courses</h1>
        <p className="text-muted">{snapshot.semester.name}</p>
      </header>
      {summaries.length === 0 ? (
        <Card className="space-y-3">
          <p>No courses yet.</p>
          <Link href={href("/settings")} className={btn.primary}>
            Add courses in Settings
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3">
          {summaries.map((s) => (
            <CourseCard key={s.course.id} summary={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
