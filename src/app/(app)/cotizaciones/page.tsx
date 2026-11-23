import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { QuotesScreen } from "./quotes-screen";

export const metadata: Metadata = { title: "Cotizaciones · Darze" };

export default function QuotesPage() {
  return (
    <RequirePermission permission="quotes:manage">
      <QuotesScreen />
    </RequirePermission>
  );
}
