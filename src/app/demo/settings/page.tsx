import { ResetDemoButton } from "@/components/demo/DemoShell";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { Card } from "@/components/ui";

export default function DemoSettingsPage() {
  return (
    <SettingsScreen
      extra={
        <section className="space-y-2" aria-labelledby="demo-h">
          <h2 id="demo-h" className="text-lg font-bold">
            Demo
          </h2>
          <Card className="space-y-3">
            <p className="text-sm text-muted">
              Sharing and account actions need a signed-in account. Demo changes are kept only in this browser.
            </p>
            <ResetDemoButton />
          </Card>
        </section>
      }
    />
  );
}
