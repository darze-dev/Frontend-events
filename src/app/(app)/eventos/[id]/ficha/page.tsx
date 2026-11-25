import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { EventSheet } from "./event-sheet";

export const metadata: Metadata = { title: "Ficha del evento · Darze" };

export default function EventSheetPage() {
  return (
    <RequirePermission permission="events:read">
      <EventSheet />
    </RequirePermission>
  );
}
