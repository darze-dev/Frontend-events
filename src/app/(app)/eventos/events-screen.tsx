"use client";

// Lista de eventos (HU10): de la fecha más próxima a la más lejana. Buscar por código o
// cliente, y filtrar por estado y rango de fechas. Los eventos nacen de un contrato firmado.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type EventStatus, type EventSummary } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { EVENT_STATUS, formatSchedule } from "@/lib/events";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/quotes";

import { EventStatusBadge } from "./event-status-badge";

const PAGE_SIZE = 20;

export function EventsScreen() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<EventStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<EventSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await api.GET("/v1/events", {
      params: {
        query: {
          text,
          status: status || null,
          date_from: dateFrom || null,
          date_to: dateTo || null,
          page,
          page_size: PAGE_SIZE,
        },
      },
    });
    setItems(data?.items ?? []);
    setTotal(data?.total ?? 0);
    setError(apiError ? errorMessage(apiError) : null);
    setLoading(false);
  }, [text, status, dateFrom, dateTo, page]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(text || status || dateFrom || dateTo);
  const change = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Eventos</h1>
          <p className="mt-1 text-sm text-muted">
            Servicios programados. Un evento nace de un contrato firmado y con adelanto pagado.
          </p>
        </div>
        <Link href="/eventos/calendario" className={secondaryButton}>
          <Icon name="calendar" className="size-4" />
          Ver calendario
        </Link>
      </header>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          Buscar
          <input
            type="search"
            value={text}
            onChange={(e) => change(setText)(e.target.value)}
            placeholder="Código o cliente"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Estado
          <select
            value={status}
            onChange={(e) => change((v) => setStatus(v as EventStatus | ""))(e.target.value)}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {(Object.keys(EVENT_STATUS) as EventStatus[]).map((value) => (
              <option key={value} value={value}>
                {EVENT_STATUS[value].label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Desde
          <input type="date" value={dateFrom} onChange={(e) => change(setDateFrom)(e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Hasta
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => change(setDateTo)(e.target.value)} className={fieldClass} />
        </label>
      </div>

      {error && <ErrorAlert message={error} />}

      {loading && items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando eventos…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="calendar" />
          </span>
          <p className="font-medium">{filtered ? "Ningún evento coincide" : "Todavía no hay eventos"}</p>
          <p className="mt-1 text-sm text-muted">
            Abre un contrato firmado y usa “Convertir en evento”.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {items.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/eventos/${event.id}`}
                  className="flex flex-col gap-2 px-4 py-3 hover:bg-surface-muted/50 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="text-sm sm:w-36">
                    <span className="block font-medium">{formatDate(event.event_date)}</span>
                    <span className="block text-xs text-muted tabular-nums">{formatSchedule(event)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-primary">
                      {event.code} · {EVENT_TYPE_LABELS[event.event_type]}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {event.client_name} · {event.venue} · {event.guests} invitados
                    </span>
                  </span>
                  <span className="text-sm text-muted sm:w-44 sm:text-right">
                    {event.coordinator_name ?? "Responsable inactivo"}
                  </span>
                  <EventStatusBadge status={event.status} />
                </Link>
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
    </div>
  );
}
