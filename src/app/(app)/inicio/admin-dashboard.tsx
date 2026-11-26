"use client";

// Panel del administrador (HU31): cotizaciones, próximos eventos, caja, cobros, almacén y compras.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass } from "@/components/ui/styles";
import { api, type Dashboard, type EventStatus, type QuoteStatus } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatSoles } from "@/lib/money";
import { EVENT_STATUS } from "@/lib/events";
import { formatDate, todayInLima } from "@/lib/quotes";

import { QuoteStatusBadge } from "../cotizaciones/quote-status-badge";

const monthName = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" });

export function AdminDashboard() {
  const [month, setMonth] = useState(todayInLima().slice(0, 7));
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: body, error: apiError } = await api.GET("/v1/dashboard", {
      params: { query: { month } },
    });
    if (body) {
      setData(body);
      setError(null);
    } else {
      setError(errorMessage(apiError));
    }
  }, [month]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <p className="py-6 text-sm text-muted">Cargando indicadores…</p>;

  const q = data.quotes;
  const label = monthName.format(new Date(`${data.month}-01T00:00:00Z`));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-semibold">Resumen del negocio</h2>
          <p className="text-sm text-muted">Las cifras del mes corresponden a {label}.</p>
        </div>
        <label className="text-sm font-medium sm:w-48">
          Mes
          <input
            type="month"
            value={month}
            max={todayInLima().slice(0, 7)}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="file" label="Borradores" value={String(q.drafts)} hint="Cotizaciones por terminar" href="/cotizaciones" />
        <Kpi icon="send" label="Esperando respuesta" value={String(q.sent_pending)} hint="Enviadas y vigentes" href="/cotizaciones" tone="primary" />
        <Kpi icon="plus" label="Cotizaciones del mes" value={String(q.created_in_month)} hint={`Creadas en ${label}`} />
        <Kpi
          icon="check"
          label="Aceptado en el mes"
          value={formatSoles(q.accepted_amount_cents)}
          hint={`${q.accepted_in_month} ${q.accepted_in_month === 1 ? "cotización" : "cotizaciones"} de ${label}`}
          tone="success"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="wallet" label="Caja del mes" value={formatSoles(data.cash.net_cents)} hint={`Ingresos ${formatSoles(data.cash.income_cents)} · Egresos ${formatSoles(data.cash.expense_cents)}`} tone="success" href="/flujo-de-caja" />
        <Kpi
          icon="contract"
          label="Cobros pendientes"
          value={formatSoles(data.receivables.total_cents)}
          hint={`${data.receivables.contracts} ${data.receivables.contracts === 1 ? "contrato" : "contratos"} con saldo`}
        />
        <Kpi
          icon="history"
          label="Cobros vencidos"
          value={formatSoles(data.receivables.overdue_cents)}
          hint={`${data.receivables.overdue_contracts} ${data.receivables.overdue_contracts === 1 ? "contrato" : "contratos"} con saldo vencido`}
        />
        <Kpi
          icon="box"
          label="Alertas de almacén"
          value={String(data.inventory.low_stock + data.inventory.expiring_soon)}
          hint={`${data.inventory.low_stock} con stock bajo · ${data.inventory.expiring_soon} por vencer`}
          href="/almacen"
        />
        <Kpi
          icon="cart"
          label="Compras abiertas"
          value={String(data.purchases.open)}
          hint={`${data.purchases.requested} solicitadas · ${data.purchases.ordered} ordenadas`}
          href="/compras"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Próximos eventos</h3>
            <Link href="/eventos/calendario" className="text-sm text-primary hover:underline">
              Calendario
            </Link>
          </div>
          <p className="text-xs text-muted">De hoy a 14 días, con el saldo por cobrar de cada contrato.</p>
          {data.upcoming_events.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted">No hay eventos en los próximos 14 días.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {data.upcoming_events.map((event) => (
                <li key={event.id}>
                  <Link href={`/eventos/${event.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
                    <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-primary-soft py-1.5 text-primary">
                      <span className="text-lg font-semibold leading-none">{event.event_date.slice(8, 10)}</span>
                      <span className="text-[11px] uppercase">{formatDate(event.event_date).split(" ")[1]}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{event.client_name}</span>
                      <span className="block text-xs text-muted">
                        {event.code} · {EVENT_STATUS[event.status as EventStatus]?.label ?? event.status}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className={`text-sm font-medium tabular-nums ${event.overdue ? "text-danger" : ""}`}>
                        {formatSoles(event.balance_cents)}
                      </span>
                      <span className={`text-[11px] ${event.overdue ? "text-danger" : "text-muted"}`}>
                        {event.overdue ? "Saldo vencido" : "Saldo"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Últimas cotizaciones</h3>
            <Link href="/cotizaciones" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          {q.recent.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted">Todavía no hay cotizaciones.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {q.recent.map((quote) => (
                <li key={quote.id}>
                  <Link href={`/cotizaciones/${quote.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-primary">{quote.code}</span>
                      <span className="block truncate text-xs text-muted">
                        {quote.client_name} · {formatDate(quote.event_date)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-medium tabular-nums">{formatSoles(quote.total_cents)}</span>
                      <QuoteStatusBadge status={quote.status as QuoteStatus} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-xs text-muted">
        “Aceptado en el mes” cuenta las cotizaciones creadas en ese mes que hoy están aceptadas.
      </p>
    </div>
  );
}

type KpiProps = {
  icon: IconName;
  label: string;
  value: string;
  hint: string;
  href?: string;
  tone?: "primary" | "success";
};

function Kpi({ icon, label, value, hint, href, tone }: KpiProps) {
  const iconTone = tone === "success" ? "bg-success/10 text-success" : tone === "primary" ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted";
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <span className={`rounded-lg p-2 ${iconTone}`}>
          <Icon name={icon} className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </>
  );
  const className = "block rounded-xl border border-line bg-surface p-5";
  return href ? (
    <Link href={href} className={`${className} transition hover:border-primary`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
