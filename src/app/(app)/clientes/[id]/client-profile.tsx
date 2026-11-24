"use client";

// Perfil del cliente con su historial comercial (HU05): sus datos, un resumen y dos pestañas,
// Cotizaciones y Eventos, con código, fecha, importe y estado. Cada fila abre su detalle.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Icon, type IconName } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { api, type ClientHistory } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatSoles } from "@/lib/money";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/quotes";

import { QuoteStatusBadge } from "../../cotizaciones/quote-status-badge";
import { EventStatusBadge } from "../../eventos/event-status-badge";

type Tab = "quotes" | "events";

type Row = {
  id: string;
  href: string;
  code: string;
  date: string;
  type: string;
  amount: number;
  status: ReactNode;
};

export function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const [history, setHistory] = useState<ClientHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("quotes");

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/clients/{client_id}/history", {
      params: { path: { client_id: id } },
    });
    if (data) setHistory(data);
    else setError(errorMessage(apiError));
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (!history) {
    return error ? <ErrorAlert message={error} /> : <p className="py-10 text-center text-sm text-muted">Cargando…</p>;
  }

  const { client, summary } = history;
  const cards: { label: string; value: string; icon: IconName }[] = [
    { label: "Cotizaciones", value: String(summary.quotes), icon: "file" },
    { label: "Aceptadas", value: String(summary.accepted_quotes), icon: "check" },
    { label: "Eventos", value: String(summary.events), icon: "calendar" },
    { label: "Total contratado", value: formatSoles(summary.contracted_cents), icon: "contract" },
  ];
  const rows: Row[] =
    tab === "quotes"
      ? history.quotes.map((q) => ({
          id: q.id,
          href: `/cotizaciones/${q.id}`,
          code: q.code,
          date: q.event_date,
          type: EVENT_TYPE_LABELS[q.event_type],
          amount: q.total_cents,
          status: <QuoteStatusBadge status={q.status} />,
        }))
      : history.events.map((e) => ({
          id: e.id,
          href: `/eventos/${e.id}`,
          code: e.code,
          date: e.event_date,
          type: EVENT_TYPE_LABELS[e.event_type],
          amount: e.total_cents,
          status: <EventStatusBadge status={e.status} />,
        }));
  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: "quotes", label: "Cotizaciones", count: history.quotes.length },
    { value: "events", label: "Eventos", count: history.events.length },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Clientes
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <StatusBadge active={client.active} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {client.document_type} {client.document_number} · {client.phone}
            {client.email ? ` · ${client.email}` : ""}
          </p>
        </div>
      </header>

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-sm text-muted">
              {card.label}
              <Icon name={card.icon} className="size-4" />
            </div>
            <p className="mt-2 text-xl font-semibold tabular-nums">{card.value}</p>
          </div>
        ))}
      </section>
      <p className="-mt-3 text-xs text-muted">El total contratado suma los contratos firmados; los anulados no cuentan.</p>

      <section className="rounded-xl border border-line bg-surface">
        <div role="tablist" aria-label="Historial" className="flex border-b border-line px-2">
          {tabs.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={tab === option.value}
              onClick={() => setTab(option.value)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium ${
                tab === option.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {option.label} <span className="tabular-nums">({option.count})</span>
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {rows.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted">
              {tab === "quotes" ? "Este cliente todavía no tiene cotizaciones." : "Este cliente todavía no tiene eventos."}
            </p>
          ) : (
            <>
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Código</th>
                    <th className="px-4 py-3 font-medium">Fecha del evento</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 text-right font-medium">Importe</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-3">
                        <Link href={row.href} className="font-medium text-primary hover:underline">
                          {row.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 text-muted">{row.type}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatSoles(row.amount)}</td>
                      <td className="px-4 py-3">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-line md:hidden">
                {rows.map((row) => (
                  <li key={row.id}>
                    <Link href={row.href} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block font-medium text-primary">{row.code}</span>
                        <span className="block text-xs text-muted">
                          {formatDate(row.date)} · {row.type}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="text-sm tabular-nums">{formatSoles(row.amount)}</span>
                        {row.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
