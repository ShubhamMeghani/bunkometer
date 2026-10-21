import { BulkMark } from "@/components/BulkMark";
import { HistoryScreen } from "@/components/screens/HistoryScreen";

export default function HistoryPage() {
  return <HistoryScreen rangeAction={<BulkMark />} />;
}
