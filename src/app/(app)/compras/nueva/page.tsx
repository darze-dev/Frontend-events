import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { NewPurchaseScreen } from "./new-purchase-screen";

export const metadata: Metadata = { title: "Nueva solicitud de compra · Darze" };

export default function NewPurchasePage() {
  return (
    <RequirePermission permission="purchasing:manage">
      <NewPurchaseScreen />
    </RequirePermission>
  );
}
