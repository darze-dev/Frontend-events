"use client";

// Anular una indisponibilidad (HU16, CA-16.18): el motivo es obligatorio y queda con quién y
// cuándo. No se borra ni se reactiva: el historial se conserva.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { dangerButton, fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type Unavailability } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = { unavailability: Unavailability; workerName: string; onDone: () => void; onClose: () => void };

export function UnavailabilityCancelForm({ unavailability, workerName, onDone, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (!reason) return setError("Indica el motivo de la anulación.");
    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = await api.POST("/v1/staff/unavailability/{unavailability_id}/cancel", {
        params: { path: { unavailability_id: unavailability.id } },
        body: { reason },
      });
      if (data) onDone();
      else setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Anular indisponibilidad" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          La indisponibilidad de &quot;{workerName}&quot; quedará anulada y dejará de reflejarse en la consulta. No se
          borra: el historial se conserva.
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
            {saving ? "Procesando…" : "Anular indisponibilidad"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
