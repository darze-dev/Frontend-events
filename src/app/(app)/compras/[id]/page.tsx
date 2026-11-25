import type { Metadata } from "next";
import { Suspense } from "react";

import { RequirePermission } from "@/components/require-permission";

import { PurchaseDetail } from "./purchase-detail";

export const metadata: Metadata = { title: "Compra · Darze" };

export default function PurchasePage() {
  return (
    <RequirePermission permission="purchasing:manage">
      <Suspense fallback={null}>
        <PurchaseDetail />
      </Suspense>
    </RequirePermission>
  );
}
