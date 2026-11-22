import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { NewQuoteScreen } from "./new-quote-screen";

export const metadata: Metadata = { title: "Nueva cotización · Darze" };

export default function NewQuotePage() {
  return (
    <RequirePermission permission="quotes:manage">
      <NewQuoteScreen />
    </RequirePermission>
  );
}
