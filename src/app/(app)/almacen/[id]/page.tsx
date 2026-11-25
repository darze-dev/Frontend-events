import type { Metadata } from "next";
import { Suspense } from "react";

import { RequirePermission } from "@/components/require-permission";

import { ProductDetail } from "./product-detail";

export const metadata: Metadata = { title: "Producto · Darze" };

export default function ProductPage() {
  return (
    <RequirePermission permission="inventory:read">
      <Suspense fallback={null}>
        <ProductDetail />
      </Suspense>
    </RequirePermission>
  );
}
