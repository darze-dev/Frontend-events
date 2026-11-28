"use client";

// Registrar o corregir la asistencia de una asignación (HU18). El primer registro no pide
// motivo; corregir "cumplió" ↔ "no cumplió" sí (R-ATT-22) y queda quién, cuándo y el valor
// anterior. La asistencia no paga ni cambia la asignación (R-ATT-15).
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Attendance, type AttendanceStatus } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { ATTENDANCE_REASON_MAX, ATTENDANCE_STATUS } from "@/lib/attendance";

type Props = {
  assignmentId: string;
  workerName: string;
  current: AttendanceStatus | null;
  onDone: (attendance: Attendance) => void;
  onClose: () => void;
};

export function AttendanceForm({ assignmentId, workerName, current, onDone, onClose }: Props) {
  const [status, setStatus] = useState<AttendanceStatus | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const correcting = current !== null && status !== null && status !== current;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status) return setError("Elige si el trabajador cumplió o no cumplió.");
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (correcting && !reason) return setError("Para corregir una asistencia ya registrada, indica el motivo.");
    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = await api.PATCH("/v1/staff/assignments/{assignment_id}/attendance", {
        params: { path: { assignment_id: assignmentId } },
        body: correcting ? { status, reason } : { status },
      });
      if (data) onDone(data);
      else setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={current ? "Corregir asistencia" : "Registrar asistencia"} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">¿&quot;{workerName}&quot; cumplió con su participación en este evento?</p>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="sr-only">Asistencia</legend>
          {(Object.keys(ATTENDANCE_STATUS) as AttendanceStatus[]).map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                status === value ? "border-primary bg-primary-soft text-primary" : "border-line hover:bg-surface-muted"
              }`}
            >
              <input
                type="radio"
                name="status"
                value={value}
                checked={status === value}
                onChange={() => setStatus(value)}
                className="sr-only"
              />
              {ATTENDANCE_STATUS[value].label}
            </label>
          ))}
        </fieldset>
        {correcting && (
          <label className={labelClass}>
            Motivo de la corrección <span className="text-danger">*</span>
            <textarea
              name="reason"
              rows={2}
              required
              maxLength={ATTENDANCE_REASON_MAX}
              autoFocus
              className={fieldClass}
            />
          </label>
        )}
        <p className="text-xs text-muted">
          Queda registrado quién y cuándo. Es un dato de evaluación: no genera pagos ni cambia la asignación.
        </p>
        {error && <ErrorAlert message={error} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || !status} className={primaryButton}>
            {saving ? "Guardando…" : current ? "Guardar corrección" : "Registrar asistencia"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
