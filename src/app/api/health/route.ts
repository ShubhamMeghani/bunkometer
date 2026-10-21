import { checkDb } from "@/lib/db/health";
import { createHealthHandler } from "@/lib/health";

export const dynamic = "force-dynamic";

export const GET = createHealthHandler(checkDb);
