// Información principal del evento seleccionado en el calendario (CA-12.4).
import Link from "next/link";

import { Modal } from "@/components/ui/modal";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import type { EventSummary } from "@/lib/api/client";
import { formatSchedule } from "@/lib/events";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/quotes";

import { EventStatusBadge } from "../event-status-badge";

export function EventSummaryModal({ event, onClose }: { event: EventSummary; onClose: () => void }) {
  const facts: [string, string][] = [
    ["Fecha", formatDate(event.event_date)],
    ["Horario", formatSchedule(event)],
    ["Cliente", event.client_name],
    ["Tipo", EVENT_TYPE_LABELS[event.event_type]],
    ["Lugar", event.venue],
    ["Invitados", String(event.guests)],
    ["Responsable", event.coordinator_name ?? "Usuario desactivado"],
  ];
  return (
    <Modal title={event.code} onClose={onClose} size="sm">
      <div className="space-y-4">
        <EventStatusBadge status={event.status} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cerrar
          </button>
          <Link href={`/eventos/${event.id}`} className={primaryButton}>
            Ver evento
          </Link>
        </div>
      </div>
    </Modal>
  );
}
