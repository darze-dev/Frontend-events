"use client";

// Tarjeta "Resultado económico" del evento (HU22, CA-22.3): cobrado al cliente (neto de
// devoluciones), egresos asociados por categoría y resultado (cobrado − egresos), con el total
// contratado y el saldo por cobrar. Nada anulado entra en el cálculo (CA-22.4).
// Solo con `finance:read` (administrador): quien la usa decide si renderizarla.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { api, type EventResult } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { EXPENSE_ROWS } from "@/lib/finance";
import { formatSoles } from "@/lib/money";

export function EventResultCard({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<EventResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/reports/events/{event_id}/result", {
      params: { path: { event_id: eventId } },
    });
    if (data) setResult(data);
    else setError(errorMessage(apiError));
  }, [eventId]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <section aria-labelledby="result-title" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="result-title" className="mb-4 font-semibold">
        Resultado económico
      </h2>
      {!result ? (
        error ? <ErrorAlert message={error} /> : <p className="text-sm text-muted">Cargando…</p>
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Total contratado</dt>
              <dd className="mt-0.5 text-sm tabular-nums">{formatSoles(result.total_cents)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Saldo por cobrar</dt>
              <dd className="mt-0.5 text-sm tabular-nums">{formatSoles(result.balance_cents)}</dd>
            </div>
          </dl>

          <table className="mt-5 w-full text-sm">
            <caption className="sr-only">Cobrado, egresos por categoría y resultado del evento</caption>
            <tbody className="divide-y divide-line">
              <tr>
                <th scope="row" className="py-2 text-left font-medium">
                  Cobrado al cliente
                </th>
                <td className="py-2 text-right font-medium tabular-nums text-success">
                  {formatSoles(result.collected_cents)}
                </td>
              </tr>
              {EXPENSE_ROWS.map(({ key, label }) => (
                <tr key={key}>
                  <th scope="row" className="py-2 pl-3 text-left font-normal text-muted">
                    {label}
                  </th>
                  <td className="py-2 text-right tabular-nums text-muted">
                    {result.expenses[key] > 0 ? `− ${formatSoles(result.expenses[key])}` : formatSoles(0)}
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="py-2 text-left font-medium">
                  Total de egresos
                </th>
                <td className="py-2 text-right font-medium tabular-nums text-danger">
                  − {formatSoles(result.expense_cents)}
                </td>
              </tr>
              <tr className="border-t-2 border-line">
                <th scope="row" className="pt-3 text-left font-semibold">
                  Resultado
                </th>
                <td
                  className={`pt-3 text-right text-base font-semibold tabular-nums ${
                    result.result_cents < 0 ? "text-danger" : "text-success"
                  }`}
                >
                  {formatSoles(result.result_cents)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted">
            Los egresos son los registrados en{" "}
            <Link href={`/caja?evento=${result.event_id}`} className="text-primary hover:underline">
              Caja
            </Link>{" "}
            con este evento. Lo anulado no se cuenta.
          </p>
        </>
      )}
    </section>
  );
}
