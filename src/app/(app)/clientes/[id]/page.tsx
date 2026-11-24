import type { Metadata } from "next";
import { Suspense } from "react";

import { RequirePermission } from "@/components/require-permission";

import { ClientProfile } from "./client-profile";

export const metadata: Metadata = { title: "Cliente · Darze" };

export default function ClientPage() {
  return (
    <RequirePermission permission="clients:manage">
      <Suspense fallback={null}>
        <ClientProfile />
      </Suspense>
    </RequirePermission>
  );
}
