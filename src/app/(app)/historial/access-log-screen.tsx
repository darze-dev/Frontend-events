"use client";

// Historial de accesos (HU03): cada intento de inicio de sesión, del más reciente al más antiguo.
// Se filtra por usuario, fechas y resultado, y se pagina. Solo se consulta: nadie lo modifica.
// Las fechas se muestran en hora de Lima; la API las guarda en UTC.
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type AccessLogEntry, type AccessResult, type User } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

const PAGE_SIZE = 20;
const LIMA_OFFSET = "-05:00"; // Perú no usa horario de verano

const RESULTS: Record<AccessResult, { label: string; className: string }> = {
  SUCCESS: { label: "Ingreso correcto", className: "bg-success/10 text-success" },
  INVALID_CREDENTIALS: { label: "Credenciales incorrectas", className: "bg-danger/10 text-danger" },
  INACTIVE_USER: { label: "Cuenta desactivada", className: "bg-warning/15 text-warning" },
};

const dateTime = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "America/Lima",
});

type Filters = { userId: string; since: string; until: string; result: AccessResult | "" };
const EMPTY: Filters = { userId: "", since: "", until: "", result: "" };

export function AccessLogScreen() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AccessLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
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
      const { data, error: apiError } = await api.GET("/v1/access-log", {
        params: {
          query: {
            user_id: filters.userId || null,
            since: filters.since ? `${filters.since}T00:00:00${LIMA_OFFSET}` : null,
            until: filters.until ? `${filters.until}T23:59:59.999${LIMA_OFFSET}` : null,
            result: filters.result || null,
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
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Historial de accesos</h1>
        <p className="mt-1 text-sm text-muted">
          Cada intento de inicio de sesión, correcto o no. Los registros no se pueden modificar ni borrar.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
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
        <label className={labelClass}>
          Resultado
          <select
            value={filters.result}
            onChange={(e) => setFilter("result", e.target.value as Filters["result"])}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {(Object.keys(RESULTS) as AccessResult[]).map((result) => (
              <option key={result} value={result}>
                {RESULTS[result].label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setFilters(EMPTY);
            setPage(1);
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
          <p className="font-medium">No hay intentos de acceso {filtered ? "con esos filtros" : "registrados"}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha y hora</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Correo escrito</th>
                  <th className="px-4 py-3 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{dateTime.format(new Date(entry.occurred_at))}</td>
                    <td className="px-4 py-3">{entry.user_name ?? <span className="text-muted">Desconocido</span>}</td>
                    <td className="px-4 py-3 text-muted">{entry.email}</td>
                    <td className="px-4 py-3">
                      <ResultBadge result={entry.result} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {items.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{entry.user_name ?? "Desconocido"}</p>
                  <ResultBadge result={entry.result} />
                </div>
                <p className="mt-1 break-all text-sm text-muted">{entry.email}</p>
                <p className="mt-2 text-sm tabular-nums">{dateTime.format(new Date(entry.occurred_at))}</p>
              </li>
            ))}
          </ul>

          <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm">
            <p className="text-muted">
              {from}–{to} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
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
                onClick={() => setPage(page + 1)}
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

function ResultBadge({ result }: { result: AccessResult }) {
  const { label, className } = RESULTS[result];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}
