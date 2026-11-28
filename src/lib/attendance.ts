// Asistencia del personal (HU18): textos y reglas que comparten la ficha del trabajador y el
// evento. "Sin registrar" (null) no es una falta (R-ATT-3).
import type { AttendanceStatus } from "@/lib/api/client";

export const ATTENDANCE_STATUS: Record<AttendanceStatus, { label: string; className: string }> = {
  ATTENDED: { label: "Cumplió", className: "bg-success/10 text-success" },
  NOT_ATTENDED: { label: "No cumplió", className: "bg-danger/10 text-danger" },
};

export const ATTENDANCE_PENDING = { label: "Sin registrar", className: "bg-surface-muted text-muted" };

export const ATTENDANCE_REASON_MAX = 500;

// Solo se registra sobre una asignación activa cuya hora de fin ya pasó (R-ATT-4, R-ATT-5).
export function attendanceDue(assignment: { assignment_status?: string; status?: string; end_at: string }): boolean {
  const status = assignment.assignment_status ?? assignment.status;
  return status === "ACTIVE" && new Date(assignment.end_at).getTime() <= Date.now();
}
