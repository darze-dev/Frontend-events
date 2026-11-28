// Textos y formatos de la disponibilidad del personal (HU16) que comparten la consulta y
// las indisponibilidades. Las reglas de verdad las aplica el backend.
import type { AvailabilityConflict, AvailabilityState, UnavailabilityKind } from "@/lib/api/client";
import { addDays, formatDate, formatTime } from "@/lib/quotes";
import { WORKER_FUNCTIONS } from "@/lib/staff";

// La consulta admite hasta 31 días (CA-16.20): la fecha final es, como mucho, inicial + 30.
export const MAX_RANGE_DAYS = 31;
export const lastAllowedDate = (from: string): string => addDays(from, MAX_RANGE_DAYS - 1);

export const AVAILABILITY_STATES: Record<AvailabilityState, { label: string; className: string }> = {
  FREE: { label: "Libre", className: "bg-success/10 text-success" },
  BUSY: { label: "Ocupado", className: "bg-warning/10 text-warning" },
  UNAVAILABLE: { label: "No disponible", className: "bg-danger/10 text-danger" },
};

export const UNAVAILABILITY_KINDS: Record<UnavailabilityKind, string> = {
  VACATION: "Vacaciones",
  LEAVE: "Permiso",
  REST: "Descanso",
  OTHER: "Otro",
};

export const UNAVAILABILITY_DESCRIPTION_MAX = 120;

// "Vacaciones", o con «Otro» la descripción que escribió el administrador.
export function kindLabel(item: { kind: UnavailabilityKind; description: string | null }): string {
  if (item.kind === "OTHER" && item.description) return item.description;
  return UNAVAILABILITY_KINDS[item.kind];
}

// Función de la asignación en conflicto ("Mozo", o la descripción si es «Otro»).
export function conflictFunction(conflict: Pick<AvailabilityConflict, "function" | "function_description">): string | null {
  if (!conflict.function) return null;
  if (conflict.function === "OTHER") return conflict.function_description || WORKER_FUNCTIONS.OTHER;
  return WORKER_FUNCTIONS[conflict.function];
}

const limaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", dateStyle: "short" });
const limaTime = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// Instante UTC → "13 dic. 2026, 08:00" en hora de Lima (R-DIS-7).
export function formatInstant(iso: string): string {
  const date = new Date(iso);
  return `${formatDate(limaDate.format(date))}, ${limaTime.format(date)}`;
}

// Intervalo "13 dic. 2026, 22:00 – 14 dic. 2026, 02:00"; si cae el mismo día, solo la hora final.
export function formatInterval(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = limaDate.format(start) === limaDate.format(end);
  return `${formatInstant(startIso)} – ${sameDay ? limaTime.format(end) : formatInstant(endIso)}`;
}

export function formatSchedule(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}
