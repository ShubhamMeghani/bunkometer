import { BulkMark } from "@/components/BulkMark";
import { HistoryScreen } from "@/components/screens/HistoryScreen";

export default function DemoHistoryPage() {
  return <HistoryScreen rangeAction={<BulkMark />} />;
}
