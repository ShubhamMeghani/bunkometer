import { describe, expect, it } from "vitest";
import { createHealthHandler } from "@/lib/health";

// AC-17 (R48)
describe("AC-17 health handler", () => {
  it("returns 200 {ok:true,db:true} when the DB check succeeds", async () => {
    const res = await createHealthHandler(async () => undefined)();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"ok":true,"db":true}');
  });

  it("returns 503 {ok:false,db:false} when the DB check throws", async () => {
    const res = await createHealthHandler(async () => {
      throw new Error("connection refused: secret-host");
    })();
    expect(res.status).toBe(503);
    expect(await res.text()).toBe('{"ok":false,"db":false}');
  });
});
