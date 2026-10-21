import type { Snapshot } from "@/lib/engine/types";

// Row-level difference between two snapshots; the server writes exactly this (PLAN 3.3/3.4).

export interface ListDiff<T> {
  added: T[];
  changed: T[];
  removed: T[];
}

function same(a: object, b: object): boolean {
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
  for (const k of keys) if (ra[k] !== rb[k]) return false;
  return true;
}

export function diffById<T extends { id: string }>(before: T[], after: T[]): ListDiff<T> {
  const old = new Map(before.map((x) => [x.id, x]));
  const now = new Map(after.map((x) => [x.id, x]));
  return {
    added: after.filter((x) => !old.has(x.id)),
    changed: after.filter((x) => old.has(x.id) && !same(old.get(x.id)!, x)),
    removed: before.filter((x) => !now.has(x.id)),
  };
}

export interface SnapshotDiff {
  semesterChanged: boolean;
  courses: ListDiff<Snapshot["courses"][number]>;
  slots: ListDiff<Snapshot["slots"][number]>;
  periods: ListDiff<Snapshot["periods"][number]>;
  rows: ListDiff<Snapshot["rows"][number]>;
}

export function diffSnapshots(before: Snapshot, after: Snapshot): SnapshotDiff {
  return {
    semesterChanged: !same(before.semester, after.semester),
    courses: diffById(before.courses, after.courses),
    slots: diffById(before.slots, after.slots),
    periods: diffById(before.periods, after.periods),
    rows: diffById(before.rows, after.rows),
  };
}

export function isEmptyDiff(d: SnapshotDiff): boolean {
  return (
    !d.semesterChanged &&
    [d.courses, d.slots, d.periods, d.rows].every((l) => l.added.length + l.changed.length + l.removed.length === 0)
  );
}
