"use client";

import { useState } from "react";
import { formatDayShort } from "@/lib/engine/dates";
import type { TrendPoint } from "@/lib/engine/stats";

const W = 320;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 22, left: 34 };
const fmt = (tenths: number) => `${Math.floor(tenths / 10)}.${tenths % 10}%`;

/**
 * Weekly cumulative attendance, one series, with a dashed reference line at the required % (SPEC R36).
 * Single series: the title names it, so there is no legend. Tap or hover shows the week's value; a table view
 * carries the same numbers.
 */
export function TrendChart({ points, requiredPct }: { points: TrendPoint[]; requiredPct: number }) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length === 0) return <p className="text-sm text-muted">No marked classes yet.</p>;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i * plotW) / (points.length - 1));
  const y = (pct: number) => PAD.top + plotH - (pct / 100) * plotH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.tenths / 10).toFixed(1)}`).join(" ");
  const shown = active ?? points.length - 1;
  const tip = points[shown];

  return (
    <figure className="space-y-2" data-testid="trend-chart">
      <figcaption className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold">Attendance by week</span>
        <span className="text-muted tabular-nums">
          {formatDayShort(tip.weekEnd)}: <span className="font-semibold text-ink">{fmt(tip.tenths)}</span> ({tip.A}/{tip.H})
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Cumulative attendance by week; latest ${fmt(points[points.length - 1].tenths)}, required ${requiredPct}%`}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - box.left) / box.width) * W;
          let best = 0;
          for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
          setActive(best);
        }}
        onPointerLeave={() => setActive(null)}
      >
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(g) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
              {g}%
            </text>
          </g>
        ))}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(requiredPct)}
          y2={y(requiredPct)}
          stroke="var(--muted)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <text x={W - PAD.right} y={y(requiredPct) - 4} textAnchor="end" fontSize={10} fill="var(--muted)">
          needs {requiredPct}%
        </text>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--muted)" strokeWidth={1} />
        )}
        {points.map((p, i) => (
          <circle
            key={p.weekEnd}
            cx={x(i)}
            cy={y(p.tenths / 10)}
            r={i === shown ? 5 : 4}
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ))}
        <text x={x(0)} y={H - 6} textAnchor={points.length === 1 ? "middle" : "start"} fontSize={10} fill="var(--muted)">
          {formatDayShort(points[0].weekEnd).slice(5)}
        </text>
        {points.length > 1 && (
          <text x={x(points.length - 1)} y={H - 6} textAnchor="end" fontSize={10} fill="var(--muted)">
            {formatDayShort(points[points.length - 1].weekEnd).slice(5)}
          </text>
        )}
      </svg>
      <details className="text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-accent">Show as table</summary>
        <table className="w-full text-left tabular-nums">
          <thead>
            <tr className="text-muted">
              <th className="py-1 font-semibold">Week ending</th>
              <th className="py-1 font-semibold">Attended / held</th>
              <th className="py-1 font-semibold">%</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.weekEnd}>
                <td className="py-1">{formatDayShort(p.weekEnd)}</td>
                <td className="py-1">
                  {p.A} / {p.H}
                </td>
                <td className="py-1">{fmt(p.tenths)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
