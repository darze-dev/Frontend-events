import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { CashFlowScreen } from "./cash-flow-screen";

export const metadata: Metadata = { title: "Flujo de caja · Darze" };

export default function CashFlowPage() {
  return (
    <RequirePermission permission="finance:read">
      <CashFlowScreen />
    </RequirePermission>
  );
}
