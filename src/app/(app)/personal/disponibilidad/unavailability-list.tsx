"use client";

// Indisponibilidades (HU16, CA-16.1, CA-16.2, CA-16.18): lista, registro, edición y anulación.
// Se muestran también las anuladas (no se borra nada). Computadora y tablet: tabla; celular: tarjetas.
import { useCallback, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { Tag } from "@/components/ui/tag";
import { fieldClass, labelClass, primaryButton } from "@/components/ui/styles";
import { api, type Unavailability, type WorkerSummary } from "@/lib/api/client";
import { MAX_RANGE_DAYS, formatSchedule, kindLabel, lastAllowedDate } from "@/lib/availability";
import { errorMessage } from "@/lib/api/errors";
import { formatDate, todayInLima } from "@/lib/quotes";

import { UnavailabilityCancelForm } from "./unavailability-cancel-form";
import { UnavailabilityForm } from "./unavailability-form";

export function UnavailabilityList() {
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [fromDate, setFromDate] = useState(todayInLima);
  // El backend filtra por ventana: ambas fechas o ninguna, de hasta 31 días. Por defecto, el próximo mes.
  const [toDate, setToDate] = useState(() => lastAllowedDate(todayInLima()));
  const [items, setItems] = useState<Unavailability[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Unavailability | "new" | null>(null);
  const [cancelling, setCancelling] = useState<Unavailability | null>(null);

  // Todos los trabajadores (también desactivados): la lista conserva el historial (R-DIS-10).
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await api.GET("/v1/staff", { params: { query: { status: "ALL", page: 1, page_size: 100 } } });
        setWorkers(data?.items ?? []);
      } catch {
        setWorkers([]);
      }
    })();
  }, []);

  const names = useMemo(() => new Map(workers.map((w) => [w.id, w.name])), [workers]);

  const load = useCallback(async () => {
    if (Boolean(fromDate) !== Boolean(toDate)) {
      setError("Indica la fecha inicial y la final, o deja ambas vacías para ver todas.");
      return;
    }
    try {
      const { data, error: apiError } = await api.GET("/v1/staff/unavailability", {
        params: { query: { worker_id: workerId || null, from_date: fromDate || null, to_date: toDate || null } },
      });
      setItems(data?.items ?? []);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setItems([]);
      setError(errorMessage(null));
    }
  }, [workerId, fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const nameOf = (item: Unavailability) => names.get(item.worker_id) ?? "Trabajador";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Vacaciones, permisos y descansos de los trabajadores. Solo informan en la consulta: no bloquean ni mueven asignaciones.
        </p>
        <button type="button" onClick={() => setEditing("new")} className={primaryButton}>
          <Icon name="plus" className="size-4" />
          Registrar indisponibilidad
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3">
        <label className={labelClass}>
          Trabajador
          <select value={workerId} onChange={(e) => setWorkerId(e.target.value)} className={fieldClass}>
            <option value="">Todos</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Desde
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Hasta
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            max={fromDate ? lastAllowedDate(fromDate) : undefined}
            onChange={(e) => setToDate(e.target.value)}
            className={fieldClass}
          />
        </label>
        <p className="text-xs text-muted sm:col-span-3">
          Muestra las indisponibilidades que se cruzan con las fechas elegidas (máximo {MAX_RANGE_DAYS} días). Deja ambas
          fechas vacías para verlas todas.
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success">
          {notice}
        </p>
      )}
      {error && <ErrorAlert message={error} />}

      {items === null ? (
        <p className="py-10 text-center text-sm text-muted">Cargando indisponibilidades…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="calendar" />
          </span>
          <p className="font-medium">No hay indisponibilidades en este rango</p>
          <p className="mt-1 text-sm text-muted">Cambia las fechas del filtro o registra una indisponibilidad nueva.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Trabajador</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Horario</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item) => (
                  <tr key={item.id} className={item.status === "CANCELLED" ? "text-muted" : "hover:bg-surface-muted/50"}>
                    <td className="px-4 py-3 font-medium">{nameOf(item)}</td>
                    <td className="px-4 py-3">{kindLabel(item)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(item.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatSchedule(item.start_time, item.end_time)}</td>
                    <td className="px-4 py-3">
                      <StatusTag item={item} />
                    </td>
                    <td className="px-4 py-3">
                      <RowActions item={item} name={nameOf(item)} onEdit={setEditing} onCancel={setCancelling} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{nameOf(item)}</p>
                    <p className="text-sm text-muted">{kindLabel(item)}</p>
                    <p className="text-sm text-muted">
                      {formatDate(item.date)} · {formatSchedule(item.start_time, item.end_time)}
                    </p>
                  </div>
                  <StatusTag item={item} />
                </div>
                {item.status === "ACTIVE" && (
                  <div className="mt-4 border-t border-line pt-3">
                    <RowActions item={item} name={nameOf(item)} onEdit={setEditing} onCancel={setCancelling} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {editing !== null && (
        <UnavailabilityForm
          unavailability={editing === "new" ? null : editing}
          workerName={editing === "new" ? null : nameOf(editing)}
          onClose={() => setEditing(null)}
          onSaved={(isNew) => {
            setEditing(null);
            setNotice(isNew ? "Indisponibilidad registrada." : "Indisponibilidad actualizada.");
            void load();
          }}
        />
      )}

      {cancelling && (
        <UnavailabilityCancelForm
          unavailability={cancelling}
          workerName={nameOf(cancelling)}
          onClose={() => setCancelling(null)}
          onDone={() => {
            setCancelling(null);
            setNotice("Indisponibilidad anulada.");
            void load();
          }}
        />
      )}
    </div>
  );
}

function StatusTag({ item }: { item: Unavailability }) {
  return item.status === "ACTIVE" ? (
    <Tag label="Vigente" className="bg-danger/10 text-danger" />
  ) : (
    <Tag label="Anulada" className="bg-surface-muted text-muted" />
  );
}

function RowActions({
  item,
  name,
  onEdit,
  onCancel,
}: {
  item: Unavailability;
  name: string;
  onEdit: (item: Unavailability) => void;
  onCancel: (item: Unavailability) => void;
}) {
  if (item.status !== "ACTIVE") return null;
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(item)}
        aria-label={`Editar indisponibilidad de ${name}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-primary hover:bg-primary-soft"
      >
        <Icon name="pencil" className="size-4" />
        Editar
      </button>
      <button
        type="button"
        onClick={() => onCancel(item)}
        aria-label={`Anular indisponibilidad de ${name}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-surface-muted hover:text-danger"
      >
        <Icon name="close" className="size-4" />
        Anular
      </button>
    </div>
  );
}
