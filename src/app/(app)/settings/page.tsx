import { signOut } from "@/lib/auth/auth";
import { requireUser } from "@/lib/server/session";

export default async function SettingsPage() {
  await requireUser();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <form action={doSignOut}>
        <button type="submit" className="min-h-11 rounded-xl border border-line bg-surface px-4 font-semibold">
          Sign out
        </button>
      </form>
    </div>
  );
}
