"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { applyMutation, validateMutation } from "@/lib/data/mutations";
import type { Mutation } from "@/lib/data/schemas";
import type { ISODate } from "@/lib/engine/dates";
import { generateSessions } from "@/lib/engine/sessions";
import { summarizeCourses, type CourseSummary } from "@/lib/engine/summary";
import type { Session, Snapshot } from "@/lib/engine/types";

export type MutateResult = { ok: true } | { ok: false; error: string };
export type MutateFn = (m: Mutation) => Promise<MutateResult>;

export interface SemesterOption {
  id: string;
  name: string;
}

interface Entry {
  seq: number;
  m: Mutation;
  ids: string[];
}

interface Toast {
  id: number;
  message: string;
  retry?: () => void;
}

interface DataContextValue {
  snapshot: Snapshot;
  today: ISODate;
  sessions: Session[];
  summaries: CourseSummary[];
  mode: "server" | "demo";
  basePath: string;
  semesters: SemesterOption[];
  online: boolean;
  href: (path: string) => string;
  run: (m: Mutation) => Promise<boolean>;
  notify: (message: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData outside DataProvider");
  return ctx;
}

function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function replay(entry: Entry): () => string {
  let i = 0;
  return () => entry.ids[i++] ?? `pending-${entry.seq}-${i}`;
}

/**
 * Holds the active semester on the client. Changes show at once (optimistic), are sent to the backend,
 * and are rolled back with a Retry toast if saving fails (SPEC R16, R21).
 */
export function DataProvider({
  initial,
  today,
  mode,
  basePath = "",
  semesters = [],
  mutateAction,
  onConfirmed,
  children,
}: {
  initial: Snapshot;
  today: ISODate;
  mode: "server" | "demo";
  basePath?: string;
  semesters?: SemesterOption[];
  mutateAction: MutateFn;
  onConfirmed?: (s: Snapshot) => void;
  children: React.ReactNode;
}) {
  const [confirmed, setConfirmed] = useState(initial);
  const [pending, setPending] = useState<Entry[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const seq = useRef(0);
  const runRef = useRef<(m: Mutation) => Promise<boolean>>(async () => false);

  const snapshot = useMemo(
    () => pending.reduce((s, e) => applyMutation(s, e.m, replay(e)), confirmed),
    [confirmed, pending],
  );
  const sessions = useMemo(() => generateSessions(snapshot), [snapshot]);
  const summaries = useMemo(() => summarizeCourses(snapshot, today, sessions), [snapshot, today, sessions]);

  useEffect(() => {
    onConfirmed?.(confirmed);
  }, [confirmed, onConfirmed]);

  const notify = useCallback((message: string, retry?: () => void) => {
    seq.current += 1;
    const id = seq.current;
    setToasts((t) => [...t.slice(-2), { id, message, retry }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), retry ? 8000 : 4000);
  }, []);

  const run = useCallback(
    async (m: Mutation): Promise<boolean> => {
      const error = validateMutation(snapshot, m, today);
      if (error) {
        notify(error);
        return false;
      }
      seq.current += 1;
      const entry: Entry = { seq: seq.current, m, ids: [] };
      applyMutation(snapshot, m, () => {
        const id = crypto.randomUUID();
        entry.ids.push(id);
        return id;
      });
      setPending((p) => [...p, entry]);
      let failure: string | null = null;
      try {
        const res = await mutateAction(m);
        if (!res.ok) failure = res.error;
      } catch {
        failure = "Couldn't save. Check your connection and try again.";
      }
      if (failure === null) {
        setConfirmed((c) => applyMutation(c, m, replay(entry)));
        setPending((p) => p.filter((e) => e.seq !== entry.seq));
        return true;
      }
      setPending((p) => p.filter((e) => e.seq !== entry.seq));
      notify(failure, () => void runRef.current(m));
      return false;
    },
    [snapshot, today, mutateAction, notify],
  );

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const value = useMemo<DataContextValue>(
    () => ({
      snapshot,
      today,
      sessions,
      summaries,
      mode,
      basePath,
      semesters,
      online,
      href: (path: string) => `${basePath}${path}`,
      run,
      notify: (message: string) => notify(message),
    }),
    [snapshot, today, sessions, summaries, mode, basePath, semesters, online, run, notify],
  );

  return (
    <DataContext.Provider value={value}>
      {children}
      {!online && (
        <div role="status" className="fixed inset-x-0 top-0 z-40 bg-warn-bg px-4 py-2 text-center text-sm font-semibold text-warn">
          You&apos;re offline. Marking is paused until you reconnect.
        </div>
      )}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.retry ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm font-medium shadow-lg"
          >
            <span>{t.message}</span>
            {t.retry && (
              <button
                type="button"
                className="min-h-11 rounded-lg px-3 font-bold text-accent"
                onClick={() => {
                  setToasts((all) => all.filter((x) => x.id !== t.id));
                  t.retry?.();
                }}
              >
                Retry
              </button>
            )}
          </div>
        ))}
      </div>
    </DataContext.Provider>
  );
}
