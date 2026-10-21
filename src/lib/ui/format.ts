import type { BudgetStatus, Kind, Status } from "@/lib/engine/types";

export const COLOUR_HEX: Record<string, string> = {
  indigo: "#6366f1",
  sky: "#0ea5e9",
  teal: "#14b8a6",
  emerald: "#10b981",
  lime: "#84cc16",
  amber: "#f59e0b",
  orange: "#f97316",
  rose: "#f43f5e",
  pink: "#ec4899",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  slate: "#64748b",
};

export const KIND_LABEL: Record<Kind, string> = { lecture: "Lecture", tutorial: "Tutorial", lab: "Lab" };

export const STATUS_LABEL: Record<Status, string> = {
  present: "Present",
  absent: "Absent",
  medical: "Medical",
  cancelled: "Cancelled",
};

export const BUDGET_LABEL: Record<BudgetStatus, string> = {
  none: "No classes",
  safe: "Safe",
  warning: "Warning",
  danger: "Danger",
};

export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function endTime(start: string, durationMin: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = (h * 60 + m + durationMin) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function timeRange(start: string, durationMin: number): string {
  return `${start}–${endTime(start, durationMin)}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
