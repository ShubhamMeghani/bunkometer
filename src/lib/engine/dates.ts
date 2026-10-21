// Calendar-date helpers. Dates are ISO strings (YYYY-MM-DD); arithmetic is done on UTC day numbers,
// so no time zone ever leaks in (SPEC C5). Pure: nothing here reads the clock.

export type ISODate = string;

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

export function toDayNumber(date: ISODate): number {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

export function fromDayNumber(day: number): ISODate {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromDayNumber(toDayNumber(date) + days);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** 1 = Monday … 7 = Sunday. */
export function weekdayOf(date: ISODate): number {
  // Day 0 (1970-01-01) was a Thursday.
  return ((((toDayNumber(date) + 3) % 7) + 7) % 7) + 1;
}

export function weekdayName(weekday: number): string {
  return WEEKDAYS[weekday - 1];
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

/** Every date from `from` to `to`, inclusive. */
export function eachDate(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = toDayNumber(from), end = toDayNumber(to); d <= end; d++) out.push(fromDayNumber(d));
  return out;
}

/** The Sunday that ends the Mon–Sun week containing `date`. */
export function weekEnding(date: ISODate): ISODate {
  return addDays(date, 7 - weekdayOf(date));
}

/** Calendar date in Asia/Kolkata for an instant (SPEC C5, R28). */
export function todayIST(instant: Date): ISODate {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** `Wed, 21 Oct` */
export function formatDayShort(date: ISODate): string {
  const [, m, d] = date.split("-").map(Number);
  return `${weekdayName(weekdayOf(date))}, ${d} ${MONTHS[m - 1]}`;
}

/** `21 Oct 2026` */
export function formatDayLong(date: ISODate): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function monthName(month: number): string {
  return MONTHS[month - 1];
}
