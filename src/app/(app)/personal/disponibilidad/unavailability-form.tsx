"use client";

// Registrar o editar una indisponibilidad (HU16, CA-16.1, CA-16.2, CA-16.14). Se elige un
// trabajador activo, el tipo (vacaciones, permiso, descanso u otro con descripción), la fecha y el
// horario local de Lima; si la hora de fin es menor, termina al día siguiente. Al editar el
// trabajador no cambia y el motivo del cambio es obligatorio (CA-16.18).
import { useEffect, useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Unavailability, type UnavailabilityKind, type WorkerSummary } from "@/lib/api/client";
import { UNAVAILABILITY_DESCRIPTION_MAX, UNAVAILABILITY_KINDS } from "@/lib/availability";
import { errorMessage } from "@/lib/api/errors";
import { formatTime, todayInLima } from "@/lib/quotes";
import { WORKER_FUNCTIONS } from "@/lib/staff";

type Props = {
  unavailability: Unavailability | null; // null = indisponibilidad nueva
  workerName: string | null;
  onSaved: (isNew: boolean) => void;
  onClose: () => void;
};

export function UnavailabilityForm({ unavailability, workerName, onSaved, onClose }: Props) {
  const isNew = unavailability === null;
  const [search, setSearch] = useState("");
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [workersLoaded, setWorkersLoaded] = useState(false);
  const [workerId, setWorkerId] = useState("");
  const [kind, setKind] = useState<UnavailabilityKind | "">(unavailability?.kind ?? "");
  const [description, setDescription] = useState(unavailability?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Solo trabajadores activos (CA-16.2). Busca 300 ms después de la última tecla.
  useEffect(() => {
    if (!isNew) return;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.GET("/v1/staff", {
          params: { query: { text: search, status: "ACTIVE", page: 1, page_size: 100 } },
        });
        setWorkers(data?.items ?? []);
      } catch {
        setWorkers([]);
      } finally {
        setWorkersLoaded(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isNew, search]);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const problem =
      (isNew && !workerId ? "Elige un trabajador." : null) ??
      (!kind ? "Elige el tipo de indisponibilidad." : null) ??
      (kind === "OTHER" && !description.trim() ? "Con el tipo «Otro», describe el motivo." : null) ??
      (text("start_time") && text("start_time") === text("end_time") ? "La hora de fin no puede ser igual a la de inicio." : null) ??
      (!isNew && !text("reason") ? "Indica el motivo del cambio." : null);
    if (problem || !kind) {
      setError(problem);
      return;
    }

    const schedule = {
      kind,
      description: kind === "OTHER" ? description.trim() : null,
      date: text("date"),
      start_time: text("start_time"),
      end_time: text("end_time"),
    };

    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = isNew
        ? await api.POST("/v1/staff/unavailability", { body: { worker_id: workerId, ...schedule } })
        : await api.PUT("/v1/staff/unavailability/{unavailability_id}", {
            params: { path: { unavailability_id: unavailability.id } },
            body: { ...schedule, reason: text("reason") },
          });
      if (data) onSaved(isNew);
      else setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? "Registrar indisponibilidad" : "Editar indisponibilidad"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {isNew ? (
          <div className="space-y-2">
            <label className={labelClass}>
              Buscar trabajador activo
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre o documento"
                autoFocus
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Trabajador <span className="text-danger">*</span>
              <select name="worker_id" value={workerId} onChange={(e) => setWorkerId(e.target.value)} className={fieldClass}>
                <option value="">{workersLoaded && workers.length === 0 ? "Sin resultados" : "Elige un trabajador"}</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                    {worker.function ? ` · ${WORKER_FUNCTIONS[worker.function]}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className="text-sm">
            <span className="text-muted">Trabajador: </span>
            <span className="font-medium">{workerName}</span>
            <span className="block text-xs text-muted">El trabajador no se cambia: anula la indisponibilidad y registra otra.</span>
          </p>
        )}

        <label className={labelClass}>
          Tipo <span className="text-danger">*</span>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as UnavailabilityKind | "")}
            className={fieldClass}
          >
            <option value="">Elige el tipo</option>
            {(Object.keys(UNAVAILABILITY_KINDS) as UnavailabilityKind[]).map((value) => (
              <option key={value} value={value}>
                {UNAVAILABILITY_KINDS[value]}
              </option>
            ))}
          </select>
        </label>
        {kind === "OTHER" && (
          <label className={labelClass}>
            Descripción <span className="text-danger">*</span>
            <input
              name="description"
              required
              maxLength={UNAVAILABILITY_DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Por ejemplo: cita médica"
              className={fieldClass}
            />
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            Fecha <span className="text-danger">*</span>
            <input type="date" name="date" required defaultValue={unavailability?.date ?? todayInLima()} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Hora de inicio <span className="text-danger">*</span>
            <input
              type="time"
              name="start_time"
              required
              defaultValue={unavailability ? formatTime(unavailability.start_time) : "00:00"}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Hora de fin <span className="text-danger">*</span>
            <input
              type="time"
              name="end_time"
              required
              defaultValue={unavailability ? formatTime(unavailability.end_time) : "23:59"}
              className={fieldClass}
            />
          </label>
        </div>
        <p className="-mt-2 text-xs text-muted">
          Si la hora de fin es menor que la de inicio, termina al día siguiente. Para un día completo usa 00:00 – 23:59.
        </p>

        {!isNew && (
          <label className={labelClass}>
            Motivo del cambio <span className="text-danger">*</span>
            <textarea name="reason" rows={2} required maxLength={500} className={fieldClass} />
          </label>
        )}

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : isNew ? "Registrar" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
