import type { Metadata } from "next";
import { Suspense } from "react";

import { RequirePermission } from "@/components/require-permission";

import { WorkerProfile } from "./worker-profile";

export const metadata: Metadata = { title: "Trabajador · Darze" };

export default function WorkerPage() {
  return (
    <RequirePermission permission="staff:manage">
      <Suspense fallback={null}>
        <WorkerProfile />
      </Suspense>
    </RequirePermission>
  );
}
