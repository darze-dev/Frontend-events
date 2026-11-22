// Textos de eventos que comparten las pantallas (HU10).
import type { EventStatus, EventSummary } from "@/lib/api/client";

import { formatTime } from "./quotes";

export const EVENT_STATUS: Record<EventStatus, { label: string; className: string }> = {
  SCHEDULED: { label: "Programado", className: "bg-primary-soft text-primary" },
  CONFIRMED: { label: "Confirmado", className: "bg-success/10 text-success" },
  IN_PROGRESS: { label: "En curso", className: "bg-warning/15 text-warning" },
  FINISHED: { label: "Finalizado", className: "bg-surface-muted text-muted" },
  CANCELLED: { label: "Cancelado", className: "bg-danger/10 text-danger" },
};

// "20:00 – 03:00 (día siguiente)"
export function formatSchedule(event: Pick<EventSummary, "start_time" | "end_time">): string {
  const nextDay = event.end_time < event.start_time ? " (día siguiente)" : "";
  return `${formatTime(event.start_time)} – ${formatTime(event.end_time)}${nextDay}`;
}
