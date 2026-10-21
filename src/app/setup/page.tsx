import { createSemester } from "@/app/actions";
import { SetupWizard } from "@/components/screens/SetupWizard";
import { listSemesters } from "@/lib/db/repo";
import { requireUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const user = await requireUser();
  const semesters = await listSemesters(user.id);
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <SetupWizard createSemester={createSemester} canCancel={semesters.length > 0} />
    </main>
  );
}
