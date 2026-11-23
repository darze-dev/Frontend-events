import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { AccessLogScreen } from "./access-log-screen";

export const metadata: Metadata = { title: "Historial de accesos · Darze" };

export default function AccessLogPage() {
  return (
    <RequirePermission permission="access_log:read">
      <AccessLogScreen />
    </RequirePermission>
  );
}
