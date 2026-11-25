// Textos de eventos que comparten las pantallas (HU10, HU11).
import type { EventAction, EventStatus, EventSummary } from "@/lib/api/client";

import { formatTime } from "./quotes";

export const EVENT_STATUS: Record<EventStatus, { label: string; className: string }> = {
  SCHEDULED: { label: "Programado", className: "bg-primary-soft text-primary" },
  CONFIRMED: { label: "Confirmado", className: "bg-success/10 text-success" },
  IN_PROGRESS: { label: "En ejecución", className: "bg-warning/15 text-warning" },
  FINISHED: { label: "Finalizado", className: "bg-surface-muted text-muted" },
  CANCELLED: { label: "Cancelado", className: "bg-danger/10 text-danger" },
};

// CA-11.4: un estado a la vez y sin volver atrás. Cancelado queda aparte (R-EVT-5).
export const EVENT_STEPS = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "FINISHED"] as const satisfies EventStatus[];

// Siguiente paso desde cada estado: qué botón se muestra y a qué ruta de la API llama.
export const NEXT_STEP: Partial<
  Record<EventStatus, { action: "confirm" | "start" | "finish"; label: string; question: string; done: string }>
> = {
  SCHEDULED: {
    action: "confirm",
    label: "Confirmar evento",
    question: "El evento pasará a confirmado. No se puede volver a programado.",
    done: "Evento confirmado.",
  },
  CONFIRMED: {
    action: "start",
    label: "Iniciar evento",
    question: "El evento pasará a en ejecución. Ya no se podrá editar la planificación ni cancelar.",
    done: "Evento en ejecución.",
  },
  IN_PROGRESS: {
    action: "finish",
    label: "Finalizar evento",
    question: "El evento pasará a finalizado. No se puede volver a en ejecución.",
    done: "Evento finalizado.",
  },
};

export const EVENT_ACTION_LABELS: Record<EventAction, string> = {
  PLANNING_UPDATED: "Planificación editada",
  CONFIRMED: "Evento confirmado",
  STARTED: "Evento iniciado",
  FINISHED: "Evento finalizado",
  CANCELLED: "Evento cancelado",
};

// R-EVT-8: se inicia el día del evento en Lima; si cruza la medianoche, también el día siguiente.
export function isEventDay(event: { event_date: string; ends_next_day: boolean }, today: string): boolean {
  if (today === event.event_date) return true;
  if (!event.ends_next_day) return false;
  const next = new Date(`${event.event_date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return today === next.toISOString().slice(0, 10);
}

// "20:00 – 03:00 (día siguiente)"
export function formatSchedule(event: Pick<EventSummary, "start_time" | "end_time">): string {
  const nextDay = event.end_time < event.start_time ? " (día siguiente)" : "";
  return `${formatTime(event.start_time)} – ${formatTime(event.end_time)}${nextDay}`;
}

const limaDateTime = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

// Fecha y hora de un registro (UTC en la API) en hora de Lima: "25 nov 2026, 15:40".
export function formatDateTimeLima(iso: string): string {
  return limaDateTime.format(new Date(iso));
}

const limaTime = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Lima",
});
const limaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });

// Turno de un registro con inicio y fin (UTC en la API) en hora de Lima: "18:00 – 02:00 (día siguiente)".
export function formatShiftLima(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const nextDay = limaDay.format(end) !== limaDay.format(start) ? " (día siguiente)" : "";
  return `${limaTime.format(start)} – ${limaTime.format(end)}${nextDay}`;
}
