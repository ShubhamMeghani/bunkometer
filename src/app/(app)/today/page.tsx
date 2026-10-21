import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/session";

export default async function TodayPage() {
  const user = await requireUser();
  if (!user.activeSemesterId) redirect("/setup");
  return <h1 className="text-2xl font-bold">Today</h1>;
}
