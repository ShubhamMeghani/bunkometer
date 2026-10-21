"use client";

import { useEffect, useId, useRef } from "react";
import type { BudgetStatus } from "@/lib/engine/types";
import { BUDGET_LABEL, COLOUR_HEX } from "@/lib/ui/format";

export const btn = {
  primary:
    "inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50",
  secondary:
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface-2 px-4 font-semibold disabled:opacity-50",
  danger:
    "inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--danger-strong)] px-4 font-semibold text-[var(--danger-on)] disabled:opacity-50",
  ghost: "inline-flex min-h-11 items-center justify-center rounded-xl px-3 font-semibold text-accent",
};

export const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink placeholder:text-muted";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>{children}</div>;
}

export function ColourDot({ colour, className = "size-3" }: { colour: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-full ${className}`} style={{ background: COLOUR_HEX[colour] ?? "#64748b" }} />;
}

const STATUS_STYLE: Record<BudgetStatus, { cls: string; icon: string }> = {
  safe: { cls: "bg-safe-bg text-safe", icon: "✓" },
  warning: { cls: "bg-warn-bg text-warn", icon: "!" },
  danger: { cls: "bg-danger-bg text-danger", icon: "✕" },
  none: { cls: "bg-none-bg text-none", icon: "–" },
};

/** Status is always text + icon + colour, never colour alone (SPEC R46). */
export function StatusChip({ status, label }: { status: BudgetStatus; label?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span data-status={status} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${s.cls}`}>
      <span aria-hidden="true">{s.icon}</span>
      {label ?? BUDGET_LABEL[status]}
    </span>
  );
}

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errId : undefined })}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={errId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Modal sheet built on <dialog>; Escape and the close button both call onClose. */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[85dvh] rounded-2xl border border-line bg-surface p-0 text-ink"
    >
      {open && (
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{title}</h2>
            <button type="button" onClick={onClose} className={btn.ghost} aria-label="Close">
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <div className="text-base">{message}</div>
      <div className="flex justify-end gap-2">
        <button type="button" className={btn.secondary} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={btn.danger} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

export function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 px-1 py-1.5 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="text-base font-bold tabular-nums" data-metric={label}>
        {value}
      </div>
    </div>
  );
}
