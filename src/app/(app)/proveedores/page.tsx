import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { SuppliersScreen } from "./suppliers-screen";

export const metadata: Metadata = { title: "Proveedores · Darze" };

export default function SuppliersPage() {
  return (
    <RequirePermission permission="purchasing:manage">
      <SuppliersScreen />
    </RequirePermission>
  );
}
