import { redirect } from "next/navigation";
import { mutate } from "@/app/actions";
import { BottomNav } from "@/components/BottomNav";
import { DataProvider } from "@/components/data/DataProvider";
import { getAppData } from "@/lib/server/app-data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await getAppData();
  if (!data.snapshot) redirect("/setup");
  return (
    <DataProvider
      key={data.snapshot.semester.id}
      initial={data.snapshot}
      today={data.today}
      mode="server"
      semesters={data.semesters.map((s) => ({ id: s.id, name: s.name }))}
      mutateAction={mutate}
    >
      <main className="mx-auto max-w-lg px-4 pb-28 pt-5">{children}</main>
      <BottomNav />
    </DataProvider>
  );
}
