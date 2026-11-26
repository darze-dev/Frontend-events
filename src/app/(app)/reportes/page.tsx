import type { Metadata } from "next";

import { ReportsScreen } from "./reports-screen";

export const metadata: Metadata = { title: "Reportes · Darze" };

export default function ReportsPage() {
  return <ReportsScreen />;
}
