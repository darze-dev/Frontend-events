"use client";

// Pestaña "Personal" del evento (feature 025). El administrador (`staff:manage`) ve las
// asignaciones con el pago acordado y las gestiona (HU17). El encargado de eventos solo ve
// quién está designado y con qué función (`staff_roster:read`): sin pagos ni botones.
import { useAuth } from "@/components/auth-provider";
import type { Event } from "@/lib/api/client";

import { EventAssignments } from "./event-assignments";
import { EventRoster } from "./event-roster";

export function EventStaff({ event }: { event: Event }) {
  const { can } = useAuth();
  return can("staff:manage") ? <EventAssignments event={event} /> : <EventRoster event={event} />;
}
