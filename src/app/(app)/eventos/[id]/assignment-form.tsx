"use client";

// Asignar un trabajador al evento o editar una asignación (HU17). Solo el administrador
// (`staff:assign`). Se elige un trabajador activo, su función (la de su ficha se propone), el
// horario y el pago acordado en soles (viaja en céntimos). Al editar, el motivo es obligatorio y
// el trabajador y el evento no cambian (R-ASG-1). Si el horario se cruza con otra asignación del
// trabajador, el backend responde 409 con los conflictos y se muestran aquí (R-ASG-5).
import { useEffect, useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import {
  api,
  type Assignment,
  type AssignmentConflict,
  type Event,
  type WorkerFunction,
  type WorkerSummary,
} from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { centsToSolesText, solesToCents } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/quotes";
import { FUNCTION_DESCRIPTION_MAX, WORKER_FUNCTIONS } from "@/lib/staff";

type Props = {
  event: Event;
  assignment: Assignment | null; // null = asignación nueva
  onSaved: (assignment: Assignment) => void;
  onClose: () => void;
};

export function AssignmentForm({ event, assignment, onSaved, onClose }: Props) {
  const isNew = assignment === null;
  const [search, setSearch] = useState("");
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [workersLoaded, setWorkersLoaded] = useState(false);
  const [workerId, setWorkerId] = useState("");
  const [workerFunction, setWorkerFunction] = useState<WorkerFunction | "">(assignment?.function ?? "");
  const [description, setDescription] = useState(assignment?.function_description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<AssignmentConflict[]>([]);
  const [saving, setSaving] = useState(false);

  // Solo trabajadores activos (R-ASG-2). Busca 300 ms después de la última tecla.
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

  // La ficha propone la función del trabajador; el administrador puede elegir otra (R-ASG-6).
  function pickWorker(id: string) {
    setWorkerId(id);
    const worker = workers.find((w) => w.id === id);
    if (worker?.function) {
      setWorkerFunction(worker.function);
      setDescription(worker.function_description ?? "");
    }
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const pay = solesToCents(text("pay"));
    const problem =
      (isNew && !workerId ? "Elige un trabajador." : null) ??
      (!workerFunction ? "Elige la función con la que trabajará en el evento." : null) ??
      (workerFunction === "OTHER" && !description.trim() ? "Con la función «Otro», describe la función real." : null) ??
      (pay === null ? "El pago acordado debe ser un monto en soles, por ejemplo 80 o 80.50." : null) ??
      (!isNew && !text("reason") ? "Indica el motivo del cambio." : null);
    if (problem || pay === null || !workerFunction) {
      setError(problem);
      return;
    }

    const schedule = {
      function: workerFunction,
      function_description: workerFunction === "OTHER" ? description.trim() : null,
      date: text("date"),
      start_time: text("start_time"),
      end_time: text("end_time"),
      pay_cents: pay,
    };

    setSaving(true);
    setError(null);
    setConflicts([]);
    try {
      const { data, error: apiError } = isNew
        ? await api.POST("/v1/staff/assignments", { body: { event_id: event.id, worker_id: workerId, ...schedule } })
        : await api.PUT("/v1/staff/assignments/{assignment_id}", {
            params: { path: { assignment_id: assignment.id } },
            body: { ...schedule, reason: text("reason") },
          });
      if (data) {
        onSaved(data);
        return;
      }
      setError(errorMessage(apiError));
      const found = (apiError as { conflicts?: AssignmentConflict[] } | undefined)?.conflicts;
      setConflicts(found ?? []);
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? "Asignar trabajador" : "Editar asignación"} onClose={onClose}>
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
              <select
                name="worker_id"
                value={workerId}
                onChange={(e) => pickWorker(e.target.value)}
                className={fieldClass}
              >
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
            <span className="font-medium">{assignment.worker_name}</span>
            <span className="block text-xs text-muted">El trabajador y el evento no se cambian: anula la asignación y crea otra.</span>
          </p>
        )}

        <label className={labelClass}>
          Función <span className="text-danger">*</span>
          <select
            name="function"
            value={workerFunction}
            onChange={(e) => setWorkerFunction(e.target.value as WorkerFunction | "")}
            className={fieldClass}
          >
            <option value="">Elige la función</option>
            {(Object.keys(WORKER_FUNCTIONS) as WorkerFunction[]).map((value) => (
              <option key={value} value={value}>
                {WORKER_FUNCTIONS[value]}
              </option>
            ))}
          </select>
        </label>
        {workerFunction === "OTHER" && (
          <label className={labelClass}>
            Descripción de la función <span className="text-danger">*</span>
            <input
              name="function_description"
              required
              maxLength={FUNCTION_DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Por ejemplo: maestro de ceremonias"
              className={fieldClass}
            />
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            Fecha <span className="text-danger">*</span>
            <input
              type="date"
              name="date"
              required
              defaultValue={assignment?.date ?? event.event_date}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Hora de inicio <span className="text-danger">*</span>
            <input
              type="time"
              name="start_time"
              required
              defaultValue={formatTime(assignment?.start_time ?? event.start_time)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Hora de fin <span className="text-danger">*</span>
            <input
              type="time"
              name="end_time"
              required
              defaultValue={formatTime(assignment?.end_time ?? event.end_time)}
              className={fieldClass}
            />
          </label>
        </div>
        <p className="-mt-2 text-xs text-muted">Si la hora de fin es menor que la de inicio, termina al día siguiente.</p>

        <label className={labelClass}>
          Pago acordado (S/) <span className="text-danger">*</span>
          <input
            name="pay"
            required
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={assignment ? centsToSolesText(assignment.pay_cents) : ""}
            className={fieldClass}
          />
        </label>

        {!isNew && (
          <label className={labelClass}>
            Motivo del cambio <span className="text-danger">*</span>
            <textarea name="reason" rows={2} required maxLength={500} className={fieldClass} />
          </label>
        )}

        {error && (
          <div className="space-y-2">
            <ErrorAlert message={error} />
            {conflicts.length > 0 && (
              <div role="alert" className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
                <p className="font-medium">Se cruza con:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>
                      {conflict.event_code} · {formatDate(conflict.event_date)} · {formatTime(conflict.start_time)} –{" "}
                      {formatTime(conflict.end_time)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : isNew ? "Asignar" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
