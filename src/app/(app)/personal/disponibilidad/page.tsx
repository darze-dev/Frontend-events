import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { AvailabilityScreen } from "./availability-screen";

export const metadata: Metadata = { title: "Disponibilidad del personal · Darze" };

// Solo el administrador (`staff:availability`): el encargado de eventos no ve datos de personal.
export default function AvailabilityPage() {
  return (
    <RequirePermission permission="staff:availability">
      <AvailabilityScreen />
    </RequirePermission>
  );
}
