import { requireUser } from "@/lib/server/session";

export default async function Page() {
  await requireUser();
  return <h1 className="text-2xl font-bold">Courses</h1>;
}
