"use client";

// Historial del asistente (HU40): cada pregunta hecha al asistente, con las funciones que consultó
// y su respuesta, de la más reciente a la más antigua. Se filtra por usuario y fechas, y se pagina.
// Solo se consulta: nadie lo modifica. Las fechas se muestran en hora de Lima; la API las guarda en UTC.
import { Fragment, useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type AssistantLogEntry, type User } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { toolLabel, toolSummary } from "@/lib/assistant";

const PAGE_SIZE = 20;
const LIMA_OFFSET = "-05:00"; // Perú no usa horario de verano

const STATUSES: Record<AssistantLogEntry["status"], { label: string; className: string }> = {
  ok: { label: "Respondida", className: "bg-success/10 text-success" },
  error: { label: "Con error", className: "bg-danger/10 text-danger" },
  refused: { label: "Rechazada", className: "bg-warning/15 text-warning" },
};

const dateTime = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "America/Lima",
});
const number = new Intl.NumberFormat("es-PE");

type Filters = { userId: string; since: string; until: string };
const EMPTY: Filters = { userId: "", since: "", until: "" };

export function AssistantLogScreen() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AssistantLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .GET("/v1/users", { params: { query: { include_inactive: true } } })
      .then(({ data }) => setUsers(data ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/assistant/log", {
        params: {
          query: {
            user_id: filters.userId || null,
            since: filters.since ? `${filters.since}T00:00:00${LIMA_OFFSET}` : null,
            until: filters.until ? `${filters.until}T23:59:59.999${LIMA_OFFSET}` : null,
            page,
            page_size: PAGE_SIZE,
          },
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
  }, [filters, page]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Al cambiar un filtro se vuelve a la primera página.
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setExpanded(null);
  };

  const toggle = (id: string) => setExpanded((current) => (current === id ? null : id));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Historial del asistente</h1>
        <p className="mt-1 text-sm text-muted">
          Cada pregunta hecha al asistente, con las funciones que consultó y su respuesta. Los registros no se pueden
          modificar ni borrar.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <label className={labelClass}>
          Usuario
          <select value={filters.userId} onChange={(e) => setFilter("userId", e.target.value)} className={fieldClass}>
            <option value="">Todos</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Desde
          <input type="date" value={filters.since} onChange={(e) => setFilter("since", e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Hasta
          <input type="date" value={filters.until} onChange={(e) => setFilter("until", e.target.value)} className={fieldClass} />
        </label>
        <button
          type="button"
          onClick={() => {
            setFilters(EMPTY);
            setPage(1);
            setExpanded(null);
          }}
          disabled={!filtered}
          className={secondaryButton}
        >
          Limpiar filtros
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {loading && items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando historial…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-medium">No hay consultas {filtered ? "con esos filtros" : "registradas"}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha y hora</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Pregunta</th>
                  <th className="px-4 py-3 font-medium">Funciones</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Tokens</th>
                  <th className="w-10 px-2 py-3">
                    <span className="sr-only">Detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((entry) => {
                  const isOpen = expanded === entry.id;
                  return (
                    <Fragment key={entry.id}>
                      <tr className={isOpen ? "bg-surface-muted/50" : undefined}>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums">{dateTime.format(new Date(entry.created_at))}</td>
                        <td className="px-4 py-3">{entry.user_name ?? <span className="text-muted">Desconocido</span>}</td>
                        <td className="max-w-xs truncate px-4 py-3" title={entry.question}>
                          {entry.question}
                        </td>
                        <td className="px-4 py-3 text-muted">{entry.tools.length > 0 ? toolSummary(entry.tools) : "Ninguna"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {number.format(entry.input_tokens + entry.output_tokens)}
                        </td>
                        <td className="px-2 py-3">
                          <ToggleButton open={isOpen} onClick={() => toggle(entry.id)} id={entry.id} />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr id={`detail-${entry.id}`} className="bg-surface-muted/50">
                          <td colSpan={7} className="px-4 pb-4">
                            <Detail entry={entry} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {items.map((entry) => {
              const isOpen = expanded === entry.id;
              return (
                <li key={entry.id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{entry.user_name ?? "Desconocido"}</p>
                    <StatusBadge status={entry.status} />
                  </div>
                  <p className="mt-1 text-sm tabular-nums text-muted">{dateTime.format(new Date(entry.created_at))}</p>
                  <p className="mt-2 break-words text-sm">{entry.question}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted">
                      {entry.tools.length > 0 ? toolSummary(entry.tools) : "Sin funciones"} ·{" "}
                      {number.format(entry.input_tokens + entry.output_tokens)} tokens
                    </p>
                    <ToggleButton open={isOpen} onClick={() => toggle(entry.id)} id={entry.id} />
                  </div>
                  {isOpen && (
                    <div id={`detail-${entry.id}`} className="mt-3 border-t border-line pt-3">
                      <Detail entry={entry} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm">
            <p className="text-muted">
              {from}–{to} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPage(page - 1);
                  setExpanded(null);
                }}
                disabled={page <= 1}
                aria-label="Página anterior"
                className={secondaryButton}
              >
                <Icon name="chevronLeft" className="size-4" />
              </button>
              <span className="tabular-nums">
                {page} / {pages}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPage(page + 1);
                  setExpanded(null);
                }}
                disabled={page >= pages}
                aria-label="Página siguiente"
                className={secondaryButton}
              >
                <Icon name="chevronRight" className="size-4" />
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function ToggleButton({ open, onClick, id }: { open: boolean; onClick: () => void; id: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={`detail-${id}`}
      aria-label={open ? "Ocultar respuesta" : "Ver respuesta"}
      title={open ? "Ocultar respuesta" : "Ver respuesta"}
      className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-fg"
    >
      <Icon name={open ? "chevronDown" : "chevronRight"} className="size-4" />
    </button>
  );
}

function StatusBadge({ status }: { status: AssistantLogEntry["status"] }) {
  const { label, className } = STATUSES[status];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

// Respuesta completa, funciones con sus parámetros y métricas de la consulta.
function Detail({ entry }: { entry: AssistantLogEntry }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Pregunta</p>
        <p className="mt-1 whitespace-pre-wrap break-words">{entry.question}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Respuesta</p>
        <p className="mt-1 whitespace-pre-wrap break-words">{entry.answer || "Sin respuesta"}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Funciones consultadas</p>
        {entry.tools.length === 0 ? (
          <p className="mt-1 text-muted">Ninguna</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {entry.tools.map((tool, index) => (
              <li key={index} className="break-words">
                <span className="font-medium">{toolLabel(tool.name)}</span>
                {tool.error && <span className="ml-2 text-danger">(con error)</span>}
                {Object.keys(tool.input).length > 0 && (
                  <code className="ml-2 break-all rounded bg-surface px-1.5 py-0.5 text-xs text-muted">
                    {JSON.stringify(tool.input)}
                  </code>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted tabular-nums">
        {number.format(entry.input_tokens)} tokens de entrada · {number.format(entry.output_tokens)} de salida ·{" "}
        {(entry.duration_ms / 1000).toFixed(1)} s
      </p>
    </div>
  );
}
