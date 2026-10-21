import { z } from "zod";
import { daysBetween, isISODate } from "@/lib/engine/dates";

// Input validation shared by the server and the demo (SPEC R8, R9, R19; PLAN 3.1).

export const COLOURS = [
  "indigo",
  "sky",
  "teal",
  "emerald",
  "lime",
  "amber",
  "orange",
  "rose",
  "pink",
  "violet",
  "cyan",
  "slate",
] as const;
export type Colour = (typeof COLOURS)[number];

/** The college preset applied to every new course (SPEC R9, decision OQ-5). */
export const COURSE_DEFAULTS = {
  requiredPct: 80,
  countTutorials: true,
  medicalCap: null as number | null,
  windowMode: "whole" as const,
};

/** SPEC §4.2 limits, enforced on the server. */
export const LIMITS = {
  semestersPerUser: 10,
  coursesPerSemester: 20,
  periodsPerSemester: 40,
  slotsPerCourse: 12,
  extrasPerCourse: 100,
};

/** The first palette colour not used yet (SPEC R9). */
export function nextColour(used: string[]): Colour {
  return COLOURS.find((c) => !used.includes(c)) ?? COLOURS[used.length % COLOURS.length];
}

export const idSchema = z.uuid();
export const isoDateSchema = z.string().refine(isISODate, "Enter a valid date");
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 09:00");
export const kindSchema = z.enum(["lecture", "tutorial", "lab"]);
export const statusSchema = z.enum(["present", "absent", "medical", "cancelled"]);

export const semesterSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(60, "At most 60 characters"),
    startDate: isoDateSchema,
    midsemDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .superRefine((s, ctx) => {
    if (!isISODate(s.startDate) || !isISODate(s.midsemDate) || !isISODate(s.endDate)) return;
    if (!(s.startDate < s.midsemDate))
      ctx.addIssue({ code: "custom", path: ["midsemDate"], message: "Midsem date must be after the start date" });
    if (!(s.midsemDate < s.endDate))
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the midsem date" });
    if (s.startDate < s.endDate && daysBetween(s.startDate, s.endDate) > 366)
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "A semester can span at most 366 days" });
  });

export const courseSchema = z.object({
  id: idSchema,
  code: z.string().trim().min(1, "Enter a course code").max(16, "At most 16 characters"),
  name: z.string().trim().min(1, "Enter a course name").max(80, "At most 80 characters"),
  colour: z.enum(COLOURS),
  requiredPct: z.number().int("Use a whole number").min(0, "0–100").max(100, "0–100"),
  countTutorials: z.boolean(),
  medicalCap: z.number().int("Use a whole number").min(0, "0–99").max(99, "0–99").nullable(),
  windowMode: z.enum(["whole", "split"]),
  sortOrder: z.number().int().min(0).max(100),
});

export const slotSchema = z
  .object({
    id: idSchema,
    courseId: idSchema,
    weekday: z.number().int().min(1).max(7),
    startTime: timeSchema,
    durationMin: z.number().int().min(15, "15–240 minutes").max(240, "15–240 minutes"),
    kind: kindSchema,
    validFrom: isoDateSchema.nullable(),
    validTo: isoDateSchema.nullable(),
  })
  .refine((s) => !s.validFrom || !s.validTo || s.validFrom <= s.validTo, {
    path: ["validTo"],
    message: "Valid-to must be on or after valid-from",
  });

export const periodSchema = z
  .object({
    id: idSchema,
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    label: z.string().trim().min(1, "Enter a label").max(40, "At most 40 characters"),
    kind: z.enum(["holiday", "exam", "other"]),
  })
  .refine((p) => p.startDate <= p.endDate, { path: ["endDate"], message: "End must be on or after start" });

export const extraSchema = z.object({
  id: idSchema,
  courseId: idSchema,
  date: isoDateSchema,
  startTime: timeSchema,
  durationMin: z.number().int().min(15, "15–240 minutes").max(240, "15–240 minutes"),
  kind: kindSchema,
  status: statusSchema.nullable(),
});

const targetSchema = z.discriminatedUnion("by", [
  z.object({ by: z.literal("slot"), slotId: idSchema, date: isoDateSchema }),
  z.object({ by: z.literal("row"), rowId: idSchema }),
]);
export type Target = z.infer<typeof targetSchema>;

export const mutationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mark"), target: targetSchema, status: statusSchema.nullable() }),
  z.object({
    type: z.literal("makeup"),
    target: targetSchema,
    makeupDate: isoDateSchema.nullable(),
    makeupDone: z.boolean(),
  }),
  z.object({ type: z.literal("saveExtra"), extra: extraSchema }),
  z.object({ type: z.literal("deleteExtra"), rowId: idSchema }),
  z.object({ type: z.literal("saveSemester"), semester: semesterSchema }),
  z.object({ type: z.literal("saveCourse"), course: courseSchema }),
  z.object({ type: z.literal("deleteCourse"), courseId: idSchema }),
  z.object({ type: z.literal("saveSlot"), slot: slotSchema }),
  z.object({ type: z.literal("deleteSlot"), slotId: idSchema }),
  z.object({ type: z.literal("savePeriod"), period: periodSchema }),
  z.object({ type: z.literal("deletePeriod"), periodId: idSchema }),
  z.object({
    type: z.literal("bulkMark"),
    from: isoDateSchema,
    to: isoDateSchema,
    status: z.enum(["absent", "medical"]),
    courseIds: z.array(idSchema).min(1, "Pick at least one course").max(LIMITS.coursesPerSemester),
  }),
]);
export type Mutation = z.infer<typeof mutationSchema>;

/** A whole new semester (setup wizard or import). */
export const newSemesterSchema = z.object({
  semester: semesterSchema,
  courses: z.array(courseSchema).max(LIMITS.coursesPerSemester),
  slots: z.array(slotSchema),
  periods: z.array(periodSchema).max(LIMITS.periodsPerSemester),
});
export type NewSemester = z.infer<typeof newSemesterSchema>;

/** First error message per field path, for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
