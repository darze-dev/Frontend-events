import type { Metadata } from "next";
import { Suspense } from "react";

import { RequirePermission } from "@/components/require-permission";

import { ContractDetail } from "./contract-detail";

export const metadata: Metadata = { title: "Contrato · Darze" };

export default function ContractPage() {
  return (
    <RequirePermission permission="contracts:manage">
      <Suspense fallback={null}>
        <ContractDetail />
      </Suspense>
    </RequirePermission>
  );
}
