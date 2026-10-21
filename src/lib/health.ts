/** GET /api/health: 200 when the users table answers, 503 otherwise, no other detail (SPEC R48). */
export function createHealthHandler(checkDb: () => Promise<unknown>) {
  return async function GET(): Promise<Response> {
    try {
      await checkDb();
      return Response.json({ ok: true, db: true }, { headers: { "cache-control": "no-store" } });
    } catch {
      return Response.json({ ok: false, db: false }, { status: 503, headers: { "cache-control": "no-store" } });
    }
  };
}
