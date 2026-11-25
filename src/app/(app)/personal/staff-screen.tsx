"use client";

// Personal (HU15): lista paginada de trabajadores, con búsqueda por nombre o documento y
// filtros por función y estado (CA-15.8). Registrar, editar, desactivar y reactivar; no hay
// borrado (CA-15.11). Computadora y tablet: tabla. Celular: tarjetas. El nombre abre la ficha.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Worker, type WorkerFunction, type WorkerSummary } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { WORKER_FUNCTIONS, WORKER_TYPES, functionLabel } from "@/lib/staff";

import { WorkerForm } from "./worker-form";
import { WorkerStatusForm } from "./worker-status-form";

const PAGE_SIZE = 20;

type StatusFilter = "ACTIVE" | "INACTIVE" | "ALL";

const STATUS_FILTERS: Record<StatusFilter, string> = {
  ACTIVE: "Activos",
  INACTIVE: "Desactivados",
  ALL: "Todos",
};

export function StaffScreen() {
  const [text, setText] = useState("");
  const [workerFunction, setWorkerFunction] = useState<WorkerFunction | "">("");
  const [status, setStatus] = useState<StatusFilter>("ACTIVE");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<WorkerSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Worker | "new" | null>(null);
  const [changingStatus, setChangingStatus] = useState<WorkerSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/staff", {
        params: {
          query: { text, function: workerFunction || null, status, page, page_size: PAGE_SIZE },
        },
      });
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setError(errorMessage(null));
    } finally {
      setLoading(false);
    }
  }, [text, workerFunction, status, page]);

  // Busca 300 ms después de la última tecla, para no llamar a la API en cada letra.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  // La fila del listado no trae teléfono ni tarifas: para editar se pide la ficha completa.
  async function edit(summary: WorkerSummary) {
    const { data, error: apiError } = await api.GET("/v1/staff/{worker_id}", {
      params: { path: { worker_id: summary.id } },
    });
    if (data) setEditing(data);
    else setError(errorMessage(apiError));
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(text.trim() || workerFunction);
  const change = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personal</h1>
          <p className="mt-1 text-sm text-muted">Cocineros, mozos, bartenders y demás trabajadores de los eventos.</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className={primaryButton}>
          <Icon name="plus" className="size-4" />
          Nuevo trabajador
        </button>
      </header>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className={`${labelClass} sm:col-span-2`}>
          Buscar
          <input
            type="search"
            value={text}
            onChange={(e) => change(setText)(e.target.value)}
            placeholder="Nombre o documento"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Función
          <select
            value={workerFunction}
            onChange={(e) => change(setWorkerFunction)(e.target.value as WorkerFunction | "")}
            className={fieldClass}
          >
            <option value="">Todas</option>
            {(Object.keys(WORKER_FUNCTIONS) as WorkerFunction[]).map((value) => (
              <option key={value} value={value}>
                {WORKER_FUNCTIONS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Estado
          <select
            value={status}
            onChange={(e) => change(setStatus)(e.target.value as StatusFilter)}
            className={fieldClass}
          >
            {(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((value) => (
              <option key={value} value={value}>
                {STATUS_FILTERS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <ErrorAlert message={error} />}

      {loading && items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando personal…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="idCard" />
          </span>
          <p className="font-medium">
            {filtered
              ? "Ningún trabajador coincide con la búsqueda"
              : status === "INACTIVE"
                ? "No hay trabajadores desactivados"
                : "Todavía no hay trabajadores"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {status === "ACTIVE"
              ? "Elige “Todos” en Estado para ver también a los desactivados, o registra un trabajador nuevo."
              : "Prueba con otro nombre, documento o función, o registra un trabajador nuevo."}
          </p>
        </div>
      ) : (
        <>
          {/* Computadora y tablet */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Función</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Tipo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((worker) => (
                  <tr key={worker.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/personal/${worker.id}`} className="text-primary hover:underline">
                        {worker.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {worker.document_type} {worker.document_number}
                    </td>
                    <td className="px-4 py-3 text-muted">{functionLabel(worker)}</td>
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">
                      {worker.worker_type ? WORKER_TYPES[worker.worker_type] : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={worker.status === "ACTIVE"} />
                    </td>
                    <td className="px-4 py-3">
                      <RowActions worker={worker} onEdit={edit} onStatus={setChangingStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular */}
          <ul className="space-y-3 md:hidden">
            {items.map((worker) => (
              <li key={worker.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/personal/${worker.id}`} className="font-medium text-primary hover:underline">
                      {worker.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {worker.document_type} {worker.document_number}
                    </p>
                    <p className="text-sm text-muted">
                      {functionLabel(worker)}
                      {worker.worker_type ? ` · ${WORKER_TYPES[worker.worker_type]}` : ""}
                    </p>
                  </div>
                  <StatusBadge active={worker.status === "ACTIVE"} />
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <RowActions worker={worker} onEdit={edit} onStatus={setChangingStatus} />
                </div>
              </li>
            ))}
          </ul>

          <nav aria-label="Páginas" className="flex items-center justify-between text-sm">
            <p className="text-muted">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Página anterior" className={secondaryButton}>
                <Icon name="chevronLeft" className="size-4" />
              </button>
              <span className="tabular-nums">{page} / {pages}</span>
              <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Página siguiente" className={secondaryButton}>
                <Icon name="chevronRight" className="size-4" />
              </button>
            </div>
          </nav>
        </>
      )}

      {editing !== null && (
        <WorkerForm
          worker={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {changingStatus && (
        <WorkerStatusForm
          worker={changingStatus}
          onClose={() => setChangingStatus(null)}
          onDone={() => {
            setChangingStatus(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function RowActions({
  worker,
  onEdit,
  onStatus,
}: {
  worker: WorkerSummary;
  onEdit: (worker: WorkerSummary) => void;
  onStatus: (worker: WorkerSummary) => void;
}) {
  const active = worker.status === "ACTIVE";
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(worker)}
        aria-label={`Editar ${worker.name}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-primary hover:bg-primary-soft"
      >
        <Icon name="pencil" className="size-4" />
        Editar
      </button>
      <button
        type="button"
        onClick={() => onStatus(worker)}
        aria-label={`${active ? "Desactivar" : "Reactivar"} ${worker.name}`}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-muted ${
          active ? "text-muted hover:text-danger" : "text-success"
        }`}
      >
        <Icon name="power" className="size-4" />
        {active ? "Desactivar" : "Reactivar"}
      </button>
    </div>
  );
}
