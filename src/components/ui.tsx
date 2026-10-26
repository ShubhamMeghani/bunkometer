"use client";

import { useEffect, useId, useRef } from "react";
import type { BudgetStatus } from "@/lib/engine/types";
import { BUDGET_LABEL, COLOUR_HEX } from "@/lib/ui/format";

export const btn = {
  primary:
    "press inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50",
  secondary:
    "press inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface-2 px-4 font-semibold hover:border-accent disabled:opacity-50",
  danger:
    "press inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--danger-strong)] px-4 font-semibold text-[var(--danger-on)] disabled:opacity-50",
  ghost: "press inline-flex min-h-11 items-center justify-center rounded-xl px-3 font-semibold text-accent hover:bg-surface-2",
};

/** Status colours for text (AA on surfaces) and for marks such as meter fills and accent bars. */
export const STATUS_TEXT: Record<BudgetStatus, string> = {
  safe: "text-safe",
  warning: "text-warn",
  danger: "text-danger",
  none: "text-ink",
};

export const STATUS_FILL: Record<BudgetStatus, string> = {
  safe: "var(--safe-strong)",
  warning: "var(--warn-strong)",
  danger: "var(--danger-strong)",
  none: "var(--muted)",
};

/** Staggered entrance; does nothing when reduced motion is requested. */
export function enter(index = 0): { className: string; style: React.CSSProperties } {
  return { className: "motion-safe:animate-fade-up", style: { animationDelay: `${Math.min(index, 6) * 40}ms` } };
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-accent">{eyebrow}</p>}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
    </header>
  );
}

/**
 * Attended share of held classes, with a tick at the requirement. Decorative: the same numbers are shown
 * as text right next to it, so it is hidden from assistive technology.
 */
export function AttendanceMeter({ A, H, p, status }: { A: number; H: number; p: number; status: BudgetStatus }) {
  const pct = H > 0 ? (100 * A) / H : 0;
  return (
    <div aria-hidden="true" className="relative pt-1">
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `${pct}%`, background: STATUS_FILL[status] }}
        />
      </div>
      <div className="absolute top-0 h-[18px] w-0.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: `${p}%` }} />
    </div>
  );
}

/** Friendly empty state: an icon, a title (kept exact for tests and the SPEC wording), a hint and an optional action. */
export function EmptyState({ icon, title, hint, children }: { icon: string; title: React.ReactNode; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="motion-safe:animate-fade-up flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-6 py-8 text-center">
      <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-surface-2 text-3xl">
        {icon}
      </span>
      <p className="text-lg font-bold" data-testid="empty-state">
        {title}
      </p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
      {children}
    </div>
  );
}

export const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink placeholder:text-muted";

export function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.12)] ${className}`} style={style}>
      {children}
    </div>
  );
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
    <div className="min-w-0 px-1 py-2 text-center">
      <div className="text-sm font-bold tabular-nums min-[400px]:text-base" data-metric={label}>
        {value}
      </div>
      <div className="text-[11px] font-medium text-muted">{label}</div>
    </div>
  );
}
