import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { AssistantLogScreen } from "./assistant-log-screen";

export const metadata: Metadata = { title: "Historial del asistente · Darze" };

export default function AssistantLogPage() {
  return (
    <RequirePermission permission="assistant_log:read">
      <AssistantLogScreen />
    </RequirePermission>
  );
}
