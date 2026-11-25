import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { ProductsScreen } from "./products-screen";

export const metadata: Metadata = { title: "Almacén · Darze" };

export default function InventoryPage() {
  return (
    <RequirePermission permission="inventory:read">
      <ProductsScreen />
    </RequirePermission>
  );
}
