"use client";

// Ficha del trabajador (HU15, CA-15.7): todos sus datos y su estado, aunque esté inactivo.
// Desde aquí se edita, se desactiva o se reactiva; nunca se borra (CA-15.11).
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Worker } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatSoles } from "@/lib/money";
import { WORKER_DOCUMENTS, WORKER_FUNCTIONS, WORKER_TYPES } from "@/lib/staff";

import { WorkerForm } from "../worker-form";
import { WorkerStatusForm } from "../worker-status-form";
import { WorkerAttendance } from "./worker-attendance";

export function WorkerProfile() {
  const { id } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error: apiError } = await api.GET("/v1/staff/{worker_id}", {
        params: { path: { worker_id: id } },
      });
      if (data) setWorker(data);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setError(errorMessage(null));
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (!worker) {
    return error ? <ErrorAlert message={error} /> : <p className="py-10 text-center text-sm text-muted">Cargando…</p>;
  }

  const active = worker.status === "ACTIVE";
  const fields: { label: string; value: ReactNode }[] = [
    { label: "Documento", value: `${WORKER_DOCUMENTS[worker.document_type]} ${worker.document_number}` },
    { label: "Teléfono", value: worker.phone || "—" },
    { label: "Función", value: worker.function ? WORKER_FUNCTIONS[worker.function] : "—" },
    ...(worker.function === "OTHER"
      ? [{ label: "Descripción de la función", value: worker.function_description || "—" }]
      : []),
    { label: "Tipo", value: worker.worker_type ? WORKER_TYPES[worker.worker_type] : "—" },
    {
      label: "Tarifa referencial por evento",
      value: worker.rate_cents != null ? formatSoles(worker.rate_cents) : "Sin tarifa",
    },
    { label: "Aplica hora extra", value: worker.overtime_applies ? "Sí" : "No" },
    ...(worker.overtime_applies
      ? [
          {
            label: "Monto referencial por hora extra",
            value: worker.overtime_rate_cents != null ? formatSoles(worker.overtime_rate_cents) : "—",
          },
        ]
      : []),
    { label: "Estado", value: <StatusBadge active={active} /> },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link href="/personal" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Personal
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{worker.name}</h1>
              <StatusBadge active={active} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {worker.document_type} {worker.document_number}
              {worker.phone ? ` · ${worker.phone}` : ""}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setChangingStatus(true)} className={secondaryButton}>
              <Icon name="power" className="size-4" />
              {active ? "Desactivar" : "Reactivar"}
            </button>
            <button type="button" onClick={() => setEditing(true)} className={primaryButton}>
              <Icon name="pencil" className="size-4" />
              Editar
            </button>
          </div>
        </div>
      </header>

      {error && <ErrorAlert message={error} />}

      {!active && (
        <p role="status" className="rounded-lg bg-surface-muted p-3 text-sm text-muted">
          Trabajador desactivado: no se puede asignar a eventos. Su ficha y su historial se conservan.
        </p>
      )}

      <section aria-label="Datos del trabajador" className="rounded-xl border border-line bg-surface">
        <dl className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          {fields.map((field) => (
            <div key={field.label} className="px-5 py-4 sm:border-b sm:border-line">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">{field.label}</dt>
              <dd className="mt-1 text-sm">{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className="-mt-3 text-xs text-muted">
        La tarifa y la hora extra son referenciales: el pago se acuerda en cada asignación a un evento.
      </p>

      <WorkerAttendance workerId={worker.id} workerName={worker.name} />

      {editing && (
        <WorkerForm
          worker={worker}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            setWorker(saved);
          }}
        />
      )}

      {changingStatus && (
        <WorkerStatusForm
          worker={worker}
          onClose={() => setChangingStatus(false)}
          onDone={() => {
            setChangingStatus(false);
            void load();
          }}
        />
      )}
    </div>
  );
}
