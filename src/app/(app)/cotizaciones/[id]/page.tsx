import type { Metadata } from "next";
import { Suspense } from "react";

import { RequirePermission } from "@/components/require-permission";

import { QuoteDetail } from "./quote-detail";

export const metadata: Metadata = { title: "Cotización · Darze" };

export default function QuotePage() {
  return (
    <RequirePermission permission="quotes:manage">
      <Suspense fallback={null}>
        <QuoteDetail />
      </Suspense>
    </RequirePermission>
  );
}
