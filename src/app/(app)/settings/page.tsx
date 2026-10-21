import { deleteAccount, signOutAction, switchSemester } from "@/app/actions";
import { SettingsScreen } from "@/components/screens/SettingsScreen";

export default function SettingsPage() {
  return <SettingsScreen account={{ switchSemester, deleteAccount, signOut: signOutAction }} />;
}
