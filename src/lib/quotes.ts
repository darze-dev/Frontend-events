// Textos y reglas de cotizaciones que comparte la pantalla (HU07–HU08).
// Las reglas de verdad las aplica el backend; esto solo sirve para mostrar y guiar.
import type { EventType, QuoteStatus } from "@/lib/api/client";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  WEDDING: "Matrimonio",
  BIRTHDAY: "Cumpleaños",
  QUINCEANERA: "Quinceañero",
  CORPORATE: "Corporativo",
  GRADUATION: "Promoción",
  OTHER: "Otro",
};

export const STATUS_STYLES: Record<QuoteStatus, { label: string; className: string }> = {
  DRAFT: { label: "Borrador", className: "bg-surface-muted text-muted" },
  SENT: { label: "Enviada", className: "bg-primary-soft text-primary" },
  ACCEPTED: { label: "Aceptada", className: "bg-success/10 text-success" },
  REJECTED: { label: "Rechazada", className: "bg-danger/10 text-danger" },
  EXPIRED: { label: "Vencida", className: "bg-warning/15 text-warning" },
};

// R-COT-3: a qué estados se puede pasar desde cada uno.
export const NEXT_STATUSES: Partial<Record<QuoteStatus, QuoteStatus[]>> = {
  DRAFT: ["SENT", "ACCEPTED", "REJECTED"],
  SENT: ["ACCEPTED", "REJECTED", "DRAFT"],
};

// Fecha de hoy en Lima como "AAAA-MM-DD" (la que usa el backend para validar).
export function todayInLima(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const longDate = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" });

// "2026-12-19" → "19 dic. 2026" (se formatea como fecha, sin correr por zona horaria).
export function formatDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`));
}

// "20:00:00" → "20:00"
export function formatTime(time: string): string {
  return time.slice(0, 5);
}
