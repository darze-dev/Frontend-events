"use client";

// Flujo de caja (HU22, solo administrador): entre dos fechas, ingresos (pagos de clientes netos
// de devoluciones + otros ingresos), egresos por categoría y saldo del periodo (CA-22.1), con
// desglose por mes (CA-22.2). Cuenta por la fecha del movimiento; lo anulado no entra (CA-22.4).
import { useCallback, useEffect, useId, useState } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type CashFlow, type CashSummary } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { EXPENSE_ROWS, formatMonth } from "@/lib/finance";
import { formatSoles } from "@/lib/money";
import { addDays, formatDate, todayInLima } from "@/lib/quotes";

const MAX_DAYS = 366;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function presets(today: string): { label: string; from: string; to: string }[] {
  const [year, month] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return [
    { label: "Este mes", from: `${year}-${pad(month)}-01`, to: today },
    {
      label: "Mes anterior",
      from: `${prevYear}-${pad(prevMonth)}-01`,
      to: addDays(`${year}-${pad(month)}-01`, -1),
    },
    { label: "Este año", from: `${year}-01-01`, to: today },
  ];
}

export function CashFlowScreen() {
  const today = todayInLima();
  const ranges = presets(today);
  const [dateFrom, setDateFrom] = useState(ranges[0].from);
  const [dateTo, setDateTo] = useState(ranges[0].to);
  const [flow, setFlow] = useState<CashFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const byCategoryId = useId();
  const byMonthId = useId();

  const rangeError =
    !dateFrom || !dateTo
      ? "Elige la fecha inicial y la final."
      : dateTo < dateFrom
        ? "La fecha final no puede ser anterior a la inicial."
        : daysBetween(dateFrom, dateTo) + 1 > MAX_DAYS
          ? `El rango no puede superar ${MAX_DAYS} días.`
          : null;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await api.GET("/v1/reports/cash-flow", {
      params: { query: { from: dateFrom, to: dateTo } },
    });
    setFlow(data ?? null);
    setError(apiError ? errorMessage(apiError) : null);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (rangeError) return;
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load, rangeError]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Flujo de caja</h1>
        <p className="mt-1 text-sm text-muted">
          Ingresos, egresos y saldo de un periodo, por la fecha de cada pago o movimiento. Lo anulado no se cuenta.
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-md">
          <label className={labelClass}>
            Desde
            <input type="date" value={dateFrom} max={today} onChange={(e) => setDateFrom(e.target.value)} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Hasta
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={fieldClass} />
          </label>
        </div>
        <div role="group" aria-label="Periodos rápidos" className="flex flex-wrap gap-2">
          {ranges.map((range) => {
            const active = range.from === dateFrom && range.to === dateTo;
            return (
              <button
                key={range.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setDateFrom(range.from);
                  setDateTo(range.to);
                }}
                className={`${secondaryButton} ${active ? "border-primary text-primary" : ""}`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {rangeError ? (
        <ErrorAlert message={rangeError} />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : !flow ? (
        <p className="py-10 text-center text-sm text-muted">Cargando flujo de caja…</p>
      ) : (
        <div aria-busy={loading} className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
          <p className="text-sm text-muted">
            Del {formatDate(flow.date_from)} al {formatDate(flow.date_to)}
          </p>
          <section aria-label="Totales del periodo" className="grid gap-3 sm:grid-cols-3">
            <Total label="Ingresos" cents={flow.totals.income_cents} tone="text-success" />
            <Total label="Egresos" cents={flow.totals.expense_cents} tone="text-danger" />
            <Total
              label="Saldo del periodo"
              cents={flow.totals.net_cents}
              tone={flow.totals.net_cents < 0 ? "text-danger" : "text-fg"}
            />
          </section>

          <section aria-labelledby={byCategoryId} className="rounded-xl border border-line bg-surface p-5">
            <h2 id={byCategoryId} className="mb-3 font-semibold">
              Por categoría
            </h2>
            <SummaryTable summary={flow.totals} />
          </section>

          <section aria-labelledby={byMonthId} className="rounded-xl border border-line bg-surface p-5">
            <h2 id={byMonthId} className="mb-3 font-semibold">
              Por mes
            </h2>
            {flow.months.length === 0 ? (
              <p className="text-sm text-muted">No hay pagos ni movimientos en este periodo.</p>
            ) : (
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead className="border-y border-line bg-surface-muted/50 text-xs text-muted">
                    <tr>
                      <th scope="col" className="px-5 py-2 text-left font-medium">Mes</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Ingresos</th>
                      {EXPENSE_ROWS.map(({ key, label }) => (
                        <th key={key} scope="col" className="px-2 py-2 text-right font-medium">
                          {label}
                        </th>
                      ))}
                      <th scope="col" className="px-2 py-2 text-right font-medium">Egresos</th>
                      <th scope="col" className="px-5 py-2 text-right font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line tabular-nums">
                    {flow.months.map((month) => (
                      <tr key={month.month}>
                        <th scope="row" className="px-5 py-2.5 text-left font-medium">
                          {formatMonth(month.month)}
                        </th>
                        <td className="px-2 py-2.5 text-right text-success">{formatSoles(month.income_cents)}</td>
                        {EXPENSE_ROWS.map(({ key }) => (
                          <td key={key} className="px-2 py-2.5 text-right text-muted">
                            {formatSoles(month.expenses[key])}
                          </td>
                        ))}
                        <td className="px-2 py-2.5 text-right text-danger">{formatSoles(month.expense_cents)}</td>
                        <td className={`px-5 py-2.5 text-right font-medium ${month.net_cents < 0 ? "text-danger" : ""}`}>
                          {formatSoles(month.net_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Total({ label, cents, tone }: { label: string; cents: number; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{formatSoles(cents)}</p>
    </div>
  );
}

function SummaryTable({ summary }: { summary: CashSummary }) {
  const row = (label: string, cents: number, options: { sign?: "+" | "−"; strong?: boolean; indent?: boolean } = {}) => (
    <tr key={label} className={options.strong ? "font-medium" : ""}>
      <th scope="row" className={`py-2 text-left ${options.strong ? "font-medium" : `font-normal text-muted ${options.indent ? "pl-3" : ""}`}`}>
        {label}
      </th>
      <td className={`py-2 text-right tabular-nums ${options.strong ? "" : "text-muted"}`}>
        {options.sign && cents > 0 ? `${options.sign} ` : ""}
        {formatSoles(cents)}
      </td>
    </tr>
  );
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Ingresos y egresos del periodo por categoría</caption>
      <tbody className="divide-y divide-line">
        {row("Pagos de clientes", summary.client_payments_cents, { indent: true })}
        {row("Devoluciones a clientes", summary.refunds_cents, { sign: "−", indent: true })}
        {row("Otros ingresos", summary.other_income_cents, { indent: true })}
        {row("Total de ingresos", summary.income_cents, { strong: true })}
        {EXPENSE_ROWS.map(({ key, label }) => row(label, summary.expenses[key], { indent: true }))}
        {row("Total de egresos", summary.expense_cents, { strong: true })}
        <tr className="border-t-2 border-line">
          <th scope="row" className="pt-3 text-left font-semibold">
            Saldo del periodo
          </th>
          <td className={`pt-3 text-right text-base font-semibold tabular-nums ${summary.net_cents < 0 ? "text-danger" : ""}`}>
            {formatSoles(summary.net_cents)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
