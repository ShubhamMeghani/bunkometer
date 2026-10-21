import { deleteAccount, publishShareAction, revokeShareAction, signOutAction, switchSemester } from "@/app/actions";
import { SharePanel } from "@/components/SharePanel";
import { SettingsScreen } from "@/components/screens/SettingsScreen";

export default function SettingsPage() {
  return (
    <SettingsScreen
      account={{ switchSemester, deleteAccount, signOut: signOutAction }}
      extra={<SharePanel actions={{ publish: publishShareAction, revoke: revokeShareAction }} />}
    />
  );
}
