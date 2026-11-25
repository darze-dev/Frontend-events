"use client";

// Desactivar o reactivar a un trabajador (CA-15.9, CA-15.10). El motivo es opcional; el
// backend guarda quién y cuándo. No hay borrado: la ficha y su historial se conservan (RN02).
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { dangerButton, fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type WorkerSummary } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = {
  worker: Pick<WorkerSummary, "id" | "name" | "status">;
  onDone: () => void;
  onClose: () => void;
};

export function WorkerStatusForm({ worker, onDone, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const deactivate = worker.status === "ACTIVE";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    const request = {
      params: { path: { worker_id: worker.id } },
      body: { reason: reason || null },
    };
    setSaving(true);
    setError(null);
    try {
      const { error: apiError } = deactivate
        ? await api.POST("/v1/staff/{worker_id}/deactivate", request)
        : await api.POST("/v1/staff/{worker_id}/activate", request);
      if (apiError) setError(errorMessage(apiError));
      else onDone();
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={deactivate ? "Desactivar trabajador" : "Reactivar trabajador"} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          {deactivate
            ? `"${worker.name}" quedará inactivo y no se podrá asignar a eventos. No se borra: su ficha y su historial se conservan, y puedes reactivarlo cuando quieras.`
            : `"${worker.name}" volverá a estar activo y disponible para asignarlo a eventos.`}
        </p>
        <label className={labelClass}>
          Motivo <span className="font-normal text-muted">(opcional)</span>
          <textarea name="reason" rows={2} autoFocus className={fieldClass} />
        </label>
        {error && <ErrorAlert message={error} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={deactivate ? dangerButton : primaryButton}>
            {saving ? "Procesando…" : deactivate ? "Desactivar" : "Reactivar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
