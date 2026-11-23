import type { Metadata } from "next";
import { Suspense } from "react";

import { RequirePermission } from "@/components/require-permission";

import { EventDetail } from "./event-detail";

export const metadata: Metadata = { title: "Evento · Darze" };

export default function EventPage() {
  return (
    <RequirePermission permission="events:read">
      <Suspense fallback={null}>
        <EventDetail />
      </Suspense>
    </RequirePermission>
  );
}
