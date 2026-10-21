import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// SPEC §4.2. Dates are `date` in string mode (YYYY-MM-DD); attendance logic never uses timestamps.

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  activeSemesterId: uuid("active_semester_id").references((): AnyPgColumn => semesters.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const semesters = pgTable(
  "semesters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    midsemDate: date("midsem_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    shareToken: text("share_token").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("semesters_user_idx").on(t.userId),
    check("semesters_name_len", sql`char_length(${t.name}) between 1 and 60`),
    check("semesters_date_order", sql`${t.startDate} < ${t.midsemDate} and ${t.midsemDate} < ${t.endDate}`),
    check("semesters_span", sql`${t.endDate} - ${t.startDate} <= 366`),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    semesterId: uuid("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    colour: text("colour").notNull(),
    requiredPct: smallint("required_pct").notNull().default(80),
    countTutorials: boolean("count_tutorials").notNull().default(true),
    medicalCap: smallint("medical_cap"),
    windowMode: text("window_mode", { enum: ["whole", "split"] }).notNull().default("whole"),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("courses_semester_code_uq").on(t.semesterId, sql`lower(${t.code})`),
    check("courses_code_len", sql`char_length(${t.code}) between 1 and 16`),
    check("courses_name_len", sql`char_length(${t.name}) between 1 and 80`),
    check("courses_required_pct", sql`${t.requiredPct} between 0 and 100`),
    check("courses_medical_cap", sql`${t.medicalCap} is null or ${t.medicalCap} between 0 and 99`),
    check("courses_window_mode", sql`${t.windowMode} in ('whole', 'split')`),
  ],
);

export const slots = pgTable(
  "slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    durationMin: smallint("duration_min").notNull(),
    kind: text("kind", { enum: ["lecture", "tutorial", "lab"] }).notNull(),
    validFrom: date("valid_from", { mode: "string" }),
    validTo: date("valid_to", { mode: "string" }),
  },
  (t) => [
    index("slots_course_idx").on(t.courseId),
    check("slots_weekday", sql`${t.weekday} between 1 and 7`),
    check("slots_duration", sql`${t.durationMin} between 15 and 240`),
    check("slots_kind", sql`${t.kind} in ('lecture', 'tutorial', 'lab')`),
  ],
);

export const noClassPeriods = pgTable(
  "no_class_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    semesterId: uuid("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "cascade" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    label: text("label").notNull(),
    kind: text("kind", { enum: ["holiday", "exam", "other"] }).notNull(),
  },
  (t) => [
    index("periods_semester_idx").on(t.semesterId),
    check("periods_order", sql`${t.startDate} <= ${t.endDate}`),
    check("periods_label_len", sql`char_length(${t.label}) between 1 and 40`),
    check("periods_kind", sql`${t.kind} in ('holiday', 'exam', 'other')`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    slotId: uuid("slot_id").references(() => slots.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    startTime: time("start_time").notNull(),
    durationMin: smallint("duration_min").notNull(),
    kind: text("kind", { enum: ["lecture", "tutorial", "lab"] }).notNull(),
    isExtra: boolean("is_extra").notNull(),
    status: text("status", { enum: ["present", "absent", "medical", "cancelled"] }),
    makeupDate: date("makeup_date", { mode: "string" }),
    makeupDone: boolean("makeup_done").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_slot_date_uq").on(t.slotId, t.date),
    index("sessions_course_date_idx").on(t.courseId, t.date),
    check("sessions_extra_slot", sql`${t.isExtra} = (${t.slotId} is null)`),
    check("sessions_kind", sql`${t.kind} in ('lecture', 'tutorial', 'lab')`),
    check(
      "sessions_status",
      sql`${t.status} is null or ${t.status} in ('present', 'absent', 'medical', 'cancelled')`,
    ),
    check(
      "sessions_makeup",
      sql`(${t.makeupDate} is null and ${t.makeupDone} = false) or (${t.kind} = 'lab' and ${t.status} in ('absent', 'medical'))`,
    ),
    check("sessions_duration", sql`${t.durationMin} between 15 and 240`),
  ],
);
