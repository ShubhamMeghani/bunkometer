import { describe, expect, it } from "vitest";
import { DEMO_TODAY, demoSeed } from "@/lib/demo/seed";
import { generateSessions, unmarkedPast } from "@/lib/engine/sessions";
import { summarizeCourses } from "@/lib/engine/summary";

// AC-16 (R42): the demo seed hits the §4.8 targets at DEMO_TODAY.
const snap = demoSeed();
const sessions = generateSessions(snap);
const summaries = summarizeCourses(snap, DEMO_TODAY, sessions);
const by = (code: string) => summaries.find((s) => s.course.code === code)!;

describe("AC-16 demo seed", () => {
  it("is deterministic", () => {
    expect(demoSeed()).toEqual(snap);
  });

  it("has split and whole courses", () => {
    expect(snap.courses.some((c) => c.windowMode === "split")).toBe(true);
    expect(snap.courses.some((c) => c.windowMode === "whole")).toBe(true);
  });

  it("exactly one course is in danger in its current window: PH 203", () => {
    const danger = summaries.filter((s) => s.current.status === "danger");
    expect(danger.map((s) => s.course.code)).toEqual(["PH 203"]);
    expect(summaries.filter((s) => s.status === "danger").map((s) => s.course.code)).toEqual(["PH 203"]);
  });

  it("MA 211: endsem safe with S ≥ 6; midsem window final and met", () => {
    const ma = by("MA 211");
    expect(ma.current.window.id).toBe("endsem");
    expect(ma.current.status).toBe("safe");
    expect(ma.current.S).toBeGreaterThanOrEqual(6);
    expect(ma.status).toBe("safe");
    expect(ma.windows[1].headline).toMatch(/^Final .* · meets 80%$/);
  });

  it("PH 203: midsem met, so the windows are clearly independent", () => {
    expect(by("PH 203").windows[1].met).toBe(true);
  });

  it("CH 201: warning, tutorials not counted, 2 medical within the cap of 3", () => {
    const ch = by("CH 201");
    expect(ch.status).toBe("warning");
    expect([ch.current.medical, ch.current.overCap, ch.course.countTutorials, ch.course.medicalCap]).toEqual([2, 0, false, 3]);
  });

  it("CS 201: lectures safe, exactly 1 pending makeup (no date) and 1 completed", () => {
    const cs = by("CS 201");
    expect(cs.current.status).toBe("safe");
    expect(cs.lab.pending).toBe(1);
    expect(cs.lab.pendingSessions[0].makeupDate).toBeNull();
    expect(cs.sessions.filter((s) => s.kind === "lab" && s.makeupDone)).toHaveLength(1);
    expect(summaries.reduce((n, s) => n + s.lab.pending, 0)).toBe(1);
  });

  it("HS 201: safe, with an extra Saturday class and a cancelled class", () => {
    const hs = by("HS 201");
    expect(hs.status).toBe("safe");
    expect(hs.sessions.some((s) => s.isExtra && s.date === "2026-09-12")).toBe(true);
    expect(hs.sessions.some((s) => s.status === "cancelled")).toBe(true);
  });

  it("nothing in the past is unmarked (U = 0) and today has ≥ 3 unmarked sessions including a lab", () => {
    expect(unmarkedPast(sessions, DEMO_TODAY)).toHaveLength(0);
    for (const s of summaries) for (const w of s.windows) expect(w.U).toBe(0);
    const today = sessions.filter((s) => s.date === DEMO_TODAY);
    expect(today.filter((s) => s.status === null).length).toBeGreaterThanOrEqual(3);
    expect(today.some((s) => s.kind === "lab" && s.status === null)).toBe(true);
  });
});
