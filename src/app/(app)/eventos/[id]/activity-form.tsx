"use client";

// Nueva actividad o cambio de responsable (HU13, R-ACT-4). El responsable es un administrador o
// encargado de eventos activo; por defecto, quien la crea.
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth-provider";
import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Activity, type Coordinator } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = {
  eventId: string;
  activity?: Activity; // con actividad: solo se cambia el responsable
  onClose: () => void;
  onSaved: (activity: Activity) => void;
};

export function ActivityForm({ eventId, activity, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [coordinators, setCoordinators] = useState<Coordinator[] | null>(null);
  const [responsible, setResponsible] = useState(activity?.responsible_id ?? user.id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.GET("/v1/events/coordinators").then(({ data, error: apiError }) => {
      setCoordinators(data ?? []);
      if (apiError) setError(errorMessage(apiError));
    });
  }, []);

  // Si el responsable actual ya no es coordinador (p. ej., desactivado), igual se muestra.
  const options =
    coordinators && activity && !coordinators.some((c) => c.id === activity.responsible_id)
      ? [{ id: activity.responsible_id, name: activity.responsible_name ?? "Usuario desactivado" }, ...coordinators]
      : coordinators;

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    setError(null);
    const { data, error: apiError } = activity
      ? await api.PUT("/v1/activities/{activity_id}/responsible", {
          params: { path: { activity_id: activity.id } },
          body: { responsible_id: responsible },
        })
      : await api.POST("/v1/events/{event_id}/activities", {
          params: { path: { event_id: eventId } },
          body: {
            description: String(new FormData(formEvent.currentTarget).get("description") ?? "").trim(),
            responsible_id: responsible || null,
          },
        });
    setSaving(false);
    if (data) onSaved(data);
    else setError(errorMessage(apiError));
  }

  return (
    <Modal title={activity ? "Cambiar responsable" : "Nueva actividad"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {activity ? (
          <p className="rounded-lg bg-surface-muted p-3 text-sm">{activity.description}</p>
        ) : (
          <label className={labelClass}>
            Actividad o indicación <span className="text-danger">*</span>
            <input
              name="description"
              required
              maxLength={200}
              autoFocus
              placeholder="Ej.: Confirmar la vajilla con el almacén"
              className={fieldClass}
            />
            <span className="mt-1 block text-xs font-normal text-muted">Hasta 200 caracteres.</span>
          </label>
        )}
        <label className={labelClass}>
          Responsable
          <select
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
            disabled={!options}
            autoFocus={Boolean(activity)}
            className={fieldClass}
          >
            {!options && <option>Cargando…</option>}
            {options?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.id === user.id ? " (yo)" : ""}
              </option>
            ))}
          </select>
        </label>
        {error && <ErrorAlert message={error} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || !options} className={primaryButton}>
            {saving ? "Guardando…" : activity ? "Guardar" : "Agregar actividad"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
