import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { PurchasesScreen } from "./purchases-screen";

export const metadata: Metadata = { title: "Compras · Darze" };

export default function PurchasesPage() {
  return (
    <RequirePermission permission="purchasing:manage">
      <PurchasesScreen />
    </RequirePermission>
  );
}
