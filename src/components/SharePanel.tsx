"use client";

import { useState } from "react";
import { useData } from "./data/DataProvider";
import { Card, btn } from "./ui";

export interface ShareActions {
  publish: () => Promise<{ ok: true; token: string } | { ok: false; error: string }>;
  revoke: () => Promise<{ ok: boolean; error?: string }>;
}

/** Publish, copy and revoke the read-only template link (SPEC R39, R41). */
export function SharePanel({ actions }: { actions: ShareActions }) {
  const { snapshot, notify } = useData();
  const [token, setToken] = useState<string | null>(snapshot.semester.shareToken ?? null);
  const [busy, setBusy] = useState(false);
  const path = token ? `/share/${token}` : null;

  return (
    <section className="space-y-2" aria-labelledby="share-h">
      <h2 id="share-h" className="text-lg font-bold">
        Share timetable
      </h2>
      <Card className="space-y-3">
        <p className="text-sm text-muted">
          Classmates can import your courses, timetable and dates as their own copy. Your marks, name and email are never shared.
        </p>
        {path ? (
          <>
            <a href={path} className="block break-all rounded-xl bg-surface-2 px-3 py-2 font-mono text-sm text-accent" data-testid="share-link">
              {path}
            </a>
            <div className="flex gap-2">
              <button
                type="button"
                className={btn.secondary}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
                    notify("Link copied");
                  } catch {
                    notify("Couldn't copy. Long-press the link instead.");
                  }
                }}
              >
                Copy link
              </button>
              <button
                type="button"
                className={btn.danger}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const res = await actions.revoke();
                  setBusy(false);
                  if (res.ok) setToken(null);
                  else notify(res.error ?? "Couldn't revoke");
                }}
              >
                Revoke link
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className={btn.primary}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await actions.publish();
              setBusy(false);
              if (res.ok) setToken(res.token);
              else notify(res.error);
            }}
          >
            Publish template link
          </button>
        )}
      </Card>
    </section>
  );
}
