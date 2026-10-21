import { requireUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  await requireUser();
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-2xl font-bold">Set up your semester</h1>
    </main>
  );
}
