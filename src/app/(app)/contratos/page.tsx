import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { ContractsScreen } from "./contracts-screen";

export const metadata: Metadata = { title: "Contratos · Darze" };

export default function ContractsPage() {
  return (
    <RequirePermission permission="contracts:manage">
      <ContractsScreen />
    </RequirePermission>
  );
}
