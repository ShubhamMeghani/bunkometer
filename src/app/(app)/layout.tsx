import { BottomNav } from "@/components/BottomNav";
import { requireUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <main className="mx-auto max-w-lg px-4 pb-28 pt-5">{children}</main>
      <BottomNav />
    </>
  );
}
