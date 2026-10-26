"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";
import { DEMO_TODAY, demoSeed } from "@/lib/demo/seed";
import { formatDayLong } from "@/lib/engine/dates";
import type { Snapshot } from "@/lib/engine/types";
import { BottomNav } from "../BottomNav";
import { DataProvider, type MutateFn } from "../data/DataProvider";

// SPEC R42, R43: the demo keeps everything in this browser's localStorage and never calls the server.

const KEY = "bunkometer-demo-v1";
const SERVER = "__server__";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function parse(raw: string | null): Snapshot {
  if (raw) {
    try {
      const s = JSON.parse(raw) as Snapshot;
      if (s?.semester?.id && Array.isArray(s.courses) && Array.isArray(s.rows)) return s;
    } catch {
      // fall through to the seed
    }
  }
  return demoSeed();
}

const saveLocally: MutateFn = async () => ({ ok: true });

export function DemoShell({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, read, () => SERVER);
  const [generation, setGeneration] = useState(0);
  const persist = useCallback((s: Snapshot) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // Private mode or blocked storage: the demo still works for this visit.
    }
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    setGeneration((g) => g + 1);
  }, []);

  return (
    <ResetContext.Provider value={reset}>
      <div className="sticky top-0 z-30 border-b border-line bg-surface-2/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-2 text-sm md:max-w-3xl" role="note" aria-label="Demo mode">
          <p>
            <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-ink">Demo</span>{" "}
            <span className="text-muted">It&apos;s {formatDayLong(DEMO_TODAY)}. Changes stay in this browser.</span>
          </p>
          <Link href="/" className="shrink-0 font-semibold text-accent">
            Sign in
          </Link>
        </div>
      </div>
      {raw === SERVER ? (
        <main className="mx-auto max-w-lg px-4 pb-28 pt-5" aria-busy="true">
          <p className="text-muted">Loading the demo…</p>
        </main>
      ) : (
        <DataProvider
          key={generation}
          initial={parse(raw)}
          today={DEMO_TODAY}
          mode="demo"
          basePath="/demo"
          mutateAction={saveLocally}
          onConfirmed={persist}
        >
          <main className="mx-auto max-w-lg px-4 pb-28 pt-6 md:max-w-3xl">{children}</main>
        </DataProvider>
      )}
      <BottomNav basePath="/demo" />
    </ResetContext.Provider>
  );
}

const ResetContext = createContext<() => void>(() => {});

/** Shown in demo Settings; restores the seed (SPEC R43). */
export function ResetDemoButton() {
  const reset = useContext(ResetContext);
  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface-2 px-4 font-semibold"
      onClick={reset}
    >
      Reset demo
    </button>
  );
}
