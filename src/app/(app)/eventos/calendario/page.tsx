import type { Metadata } from "next";
import { Suspense } from "react";

import { RequirePermission } from "@/components/require-permission";

import { CalendarScreen } from "./calendar-screen";

export const metadata: Metadata = { title: "Calendario de eventos · Darze" };

export default function CalendarPage() {
  return (
    <RequirePermission permission="events:read">
      <Suspense fallback={null}>
        <CalendarScreen />
      </Suspense>
    </RequirePermission>
  );
}
