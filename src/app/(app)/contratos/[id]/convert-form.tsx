"use client";

// Convertir el contrato firmado en evento (HU10, R-EVT-1). El responsable de coordinación es
// un usuario del sistema; por defecto, quien convierte (R-EVT-2).
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth-provider";
import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Contract, type Coordinator } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/quotes";

type Props = { contract: Contract; onClose: () => void };

export function ConvertForm({ contract, onClose }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [coordinators, setCoordinators] = useState<Coordinator[] | null>(null);
  const [coordinator, setCoordinator] = useState(user.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.GET("/v1/events/coordinators").then(({ data, error: apiError }) => {
      setCoordinators(data ?? []);
      if (apiError) setError(errorMessage(apiError));
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/events", {
      body: { contract_id: contract.id, coordinator_id: coordinator || null },
    });
    if (data) {
      router.push(`/eventos/${data.id}?nuevo=1`);
      return;
    }
    setSaving(false);
    setError(errorMessage(apiError));
  }

  return (
    <Modal title={`Convertir ${contract.code} en evento`} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          Se crea un evento programado para el {formatDate(contract.event_date)}, con el cliente,
          el horario, el lugar, los invitados y los servicios del contrato.
        </p>
        <label className={labelClass}>
          Responsable de coordinación
          <select
            value={coordinator}
            onChange={(e) => setCoordinator(e.target.value)}
            disabled={!coordinators}
            className={fieldClass}
          >
            {!coordinators && <option>Cargando…</option>}
            {coordinators?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.id === user.id ? " (yo)" : ""}
              </option>
            ))}
          </select>
        </label>
        {error && <ErrorAlert message={error} />}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || !coordinators} className={primaryButton}>
            {saving ? "Creando…" : "Convertir en evento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
