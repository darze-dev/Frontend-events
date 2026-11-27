"use client";

// Anular una asignación (HU17, R-ASG-8): el motivo es obligatorio y queda con quién y cuándo.
// No se borra: el historial se conserva.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { dangerButton, fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type Assignment } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = { assignment: Assignment; onDone: (assignment: Assignment) => void; onClose: () => void };

export function AssignmentCancelForm({ assignment, onDone, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (!reason) return setError("Indica el motivo de la anulación.");
    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = await api.POST("/v1/staff/assignments/{assignment_id}/cancel", {
        params: { path: { assignment_id: assignment.id } },
        body: { reason },
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
    <Modal title="Anular asignación" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          La asignación de &quot;{assignment.worker_name}&quot; quedará anulada y el trabajador quedará libre en ese
          horario. No se borra: el historial se conserva.
        </p>
        <label className={labelClass}>
          Motivo <span className="text-danger">*</span>
          <textarea name="reason" rows={2} required maxLength={500} autoFocus className={fieldClass} />
        </label>
        {error && <ErrorAlert message={error} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={dangerButton}>
            {saving ? "Procesando…" : "Anular asignación"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
