"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, btn, inputClass } from "./ui";

/** Import a classmate's timetable by pasting their share link (SPEC R7, R40). */
export function ImportLink({ importAction }: { importAction: (link: string) => Promise<{ ok: boolean; error?: string }> }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="space-y-2">
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const res = await importAction(link);
          setBusy(false);
          if (!res.ok) return setError(res.error ?? "Couldn't import");
          router.push("/today");
          router.refresh();
        }}
      >
        <label htmlFor="import-link" className="block text-sm font-semibold">
          Have a classmate&apos;s share link?
        </label>
        <div className="flex gap-2">
          <input id="import-link" className={inputClass} placeholder="https://…/share/…" value={link} onChange={(e) => setLink(e.target.value)} />
          <button type="submit" className={btn.secondary} disabled={busy || link.trim() === ""}>
            Import
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </form>
    </Card>
  );
}
