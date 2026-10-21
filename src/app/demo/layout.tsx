import type { Metadata } from "next";
import { DemoShell } from "@/components/demo/DemoShell";

export const metadata: Metadata = { title: "Bunk-o-Meter demo" };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoShell>{children}</DemoShell>;
}
