"use client";

// Lista de cotizaciones (HU08, CA-08.5): buscar por código o cliente, filtrar por estado y fecha
// del evento, y abrir cada una. La más reciente aparece primero.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type QuoteStatus, type QuoteSummary } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatSoles } from "@/lib/money";
import { EVENT_TYPE_LABELS, STATUS_STYLES, formatDate } from "@/lib/quotes";

import { QuoteStatusBadge } from "./quote-status-badge";

const PAGE_SIZE = 20;

export function QuotesScreen() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<QuoteStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<QuoteSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/quotes", {
        params: {
          query: {
            text,
            status: status || null,
            event_date_from: from || null,
            event_date_to: to || null,
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
  }, [text, status, from, to, page]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  // Al cambiar un filtro se vuelve a la primera página.
  const filter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(text || status || from || to);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cotizaciones</h1>
          <p className="mt-1 text-sm text-muted">Propuestas económicas para los eventos de cada cliente.</p>
        </div>
        <Link href="/cotizaciones/nueva" className={primaryButton}>
          <Icon name="plus" className="size-4" />
          Nueva cotización
        </Link>
      </header>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className={`${labelClass} sm:col-span-2 lg:col-span-1`}>
          Buscar
          <span className="relative block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 mt-[3px] size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={text}
              onChange={(e) => filter(setText)(e.target.value)}
              placeholder="Código o cliente"
              className={`${fieldClass} pl-9`}
            />
          </span>
        </label>
        <label className={labelClass}>
          Estado
          <select
            value={status}
            onChange={(e) => filter(setStatus)(e.target.value as QuoteStatus | "")}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {(Object.keys(STATUS_STYLES) as QuoteStatus[]).map((value) => (
              <option key={value} value={value}>
                {STATUS_STYLES[value].label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Evento desde
          <input type="date" value={from} onChange={(e) => filter(setFrom)(e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Evento hasta
          <input type="date" value={to} onChange={(e) => filter(setTo)(e.target.value)} className={fieldClass} />
        </label>
      </div>

      {error && <ErrorAlert message={error} />}

      {loading && items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando cotizaciones…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="file" />
          </span>
          <p className="font-medium">
            {filtered ? "Ninguna cotización coincide con los filtros" : "Todavía no hay cotizaciones"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {filtered ? "Prueba con otro código, cliente, estado o fecha." : "Crea la primera con “Nueva cotización”."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((quote) => (
                  <tr
                    key={quote.id}
                    onClick={() => router.push(`/cotizaciones/${quote.id}`)}
                    className="cursor-pointer hover:bg-surface-muted/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      <Link href={`/cotizaciones/${quote.id}`} className="text-primary hover:underline">
                        {quote.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{quote.client_name}</td>
                    <td className="px-4 py-3 text-muted">
                      {EVENT_TYPE_LABELS[quote.event_type]} · {quote.guests} inv.
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(quote.event_date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                      {formatSoles(quote.total_cents)}
                    </td>
                    <td className="px-4 py-3">
                      <QuoteStatusBadge status={quote.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {items.map((quote) => (
              <li key={quote.id}>
                <Link href={`/cotizaciones/${quote.id}`} className="block rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-primary">{quote.code}</p>
                      <p className="text-sm">{quote.client_name}</p>
                    </div>
                    <QuoteStatusBadge status={quote.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {EVENT_TYPE_LABELS[quote.event_type]} · {formatDate(quote.event_date)} · {quote.guests} invitados
                  </p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">{formatSoles(quote.total_cents)}</p>
                </Link>
              </li>
            ))}
          </ul>

          <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm">
            <p className="text-muted">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Página anterior" className={secondaryButton}>
                <Icon name="chevronLeft" className="size-4" />
              </button>
              <span className="tabular-nums">
                {page} / {pages}
              </span>
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
