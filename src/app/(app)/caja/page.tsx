import type { Metadata } from "next";
import { Suspense } from "react";

import { RequirePermission } from "@/components/require-permission";

import { CashScreen } from "./cash-screen";

export const metadata: Metadata = { title: "Caja · Darze" };

export default function CashPage() {
  return (
    <RequirePermission permission="payments:record">
      <Suspense fallback={null}>
        <CashScreen />
      </Suspense>
    </RequirePermission>
  );
}
