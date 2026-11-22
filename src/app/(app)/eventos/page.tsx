import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { EventsScreen } from "./events-screen";

export const metadata: Metadata = { title: "Eventos · Darze" };

export default function EventsPage() {
  return (
    <RequirePermission permission="events:read">
      <EventsScreen />
    </RequirePermission>
  );
}
