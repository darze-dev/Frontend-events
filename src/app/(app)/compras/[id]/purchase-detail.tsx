"use client";

// Detalle de una compra (HU28, HU29): líneas, proveedor, factura, total y fechas en hora de Lima.
// Según el estado (RN21): solicitada → "Ordenar" (proveedor y costos) o "Cancelar";
// ordenada → "Recibir" (cantidades reales, lote y vencimiento, con confirmación) o "Cancelar".
// Recibida o cancelada ya no cambia (CA-29.3).
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { VoidForm } from "@/components/finance/void-form";
import { Icon } from "@/components/icons";
import { useEventCodes } from "@/components/inventory/use-event-codes";
import { ErrorAlert } from "@/components/ui/alert";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Purchase } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatDateTimeLima } from "@/lib/events";
import { formatQuantityWithUnit, toMilli } from "@/lib/inventory";
import { formatSoles } from "@/lib/money";
import { formatDate } from "@/lib/quotes";

import { PurchaseStatusBadge } from "../purchase-status-badge";
import { ExpenseForm } from "./expense-form";
import { OrderForm } from "./order-form";
import { ReceiveForm } from "./receive-form";

type Action = "order" | "receive" | "cancel" | "expense";

export function PurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const { can } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const eventCodes = useEventCodes([purchase?.event_id]);

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/purchasing/purchases/{purchase_id}", {
      params: { path: { purchase_id: id } },
    });
    if (data) setPurchase(data);
    else setError(errorMessage(apiError));
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (!purchase) {
    return error ? <ErrorAlert message={error} /> : <p className="py-10 text-center text-sm text-muted">Cargando…</p>;
  }

  async function cancel(current: Purchase, reason: string): Promise<string | null> {
    const { data, error: apiError } = await api.POST("/v1/purchasing/purchases/{purchase_id}/cancel", {
      params: { path: { purchase_id: current.id } },
      body: { reason },
    });
    if (!data) return errorMessage(apiError);
    setPurchase(data);
    setAction(null);
    setNotice("Compra cancelada.");
    return null;
  }

  async function downloadPdf(current: Purchase) {
    setDownloading(true);
    setError(null);
    try {
      const { data, error: apiError } = await api.GET("/v1/purchasing/purchases/{purchase_id}/pdf", {
        params: { path: { purchase_id: current.id } },
        parseAs: "blob",
      });
      if (!data) {
        setError(errorMessage(apiError));
        return;
      }
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${current.code}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(errorMessage(null));
    } finally {
      setDownloading(false);
    }
  }

  const done = (updated: Purchase, message: string) => {
    setPurchase(updated);
    setAction(null);
    setNotice(message);
  };

  const { status } = purchase;
  const received = status === "RECEIVED";
  const priced = status === "ORDERED" || received;
  const timeline: [string, string | null][] = [
    ["Solicitada", purchase.created_at],
    ["Ordenada", purchase.ordered_at],
    ["Recibida", purchase.received_at],
    ["Cancelada", purchase.cancelled_at],
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link href="/compras" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Compras
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{purchase.code}</h1>
              <PurchaseStatusBadge status={status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {purchase.supplier_name ? `Proveedor: ${purchase.supplier_name}` : "Sin proveedor todavía: se elige al ordenar."}
              {purchase.event_id && (
                <>
                  {" · Para "}
                  <Link href={`/eventos/${purchase.event_id}`} className="text-primary hover:underline">
                    {eventCodes[purchase.event_id] ?? "el evento"}
                  </Link>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void downloadPdf(purchase)} disabled={downloading} className={secondaryButton}>
              <Icon name="download" className="size-4" />
              {downloading ? "Generando…" : "Descargar PDF"}
            </button>
            {received && !purchase.expense_movement_id && can("purchasing:manage") && can("payments:record") && (
              <button type="button" onClick={() => setAction("expense")} className={primaryButton}>
                Registrar egreso
              </button>
            )}
            {status === "REQUESTED" && (
              <button type="button" onClick={() => setAction("order")} className={primaryButton}>
                Ordenar
              </button>
            )}
            {status === "ORDERED" && (
              <button type="button" onClick={() => setAction("receive")} className={primaryButton}>
                <Icon name="check" className="size-4" />
                Recibir
              </button>
            )}
            {(status === "REQUESTED" || status === "ORDERED") && (
              <button type="button" onClick={() => setAction("cancel")} className={`${secondaryButton} hover:text-danger`}>
                <Icon name="close" className="size-4" />
                Cancelar compra
              </button>
            )}
          </div>
        </div>
        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Icon name="check" className="size-4 shrink-0" />
            {notice}
          </div>
        )}
        {error && <ErrorAlert message={error} />}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="px-4 pt-4 text-left font-semibold">Productos</caption>
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Producto</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium">Pedido</th>
                {priced && <th scope="col" className="px-2 py-2.5 text-right font-medium">Costo unit.</th>}
                {received && <th scope="col" className="px-2 py-2.5 text-right font-medium">Llegó</th>}
                {received && <th scope="col" className="px-2 py-2.5 font-medium">Lote / vence</th>}
                {priced && <th scope="col" className="px-4 py-2.5 text-right font-medium">Importe</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {purchase.lines.map((line) => {
                const differs =
                  line.received_quantity != null && toMilli(line.received_quantity) !== toMilli(line.quantity);
                return (
                  <tr key={line.product_id}>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/almacen/${line.product_id}`} className="font-medium text-primary hover:underline">
                        {line.product_name ?? "Producto"}
                      </Link>
                      {line.product_code && <span className="block text-xs text-muted">{line.product_code}</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums">
                      {formatQuantityWithUnit(line.quantity, line.unit)}
                    </td>
                    {priced && (
                      <td className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums">
                        {line.unit_cost_cents != null ? formatSoles(line.unit_cost_cents) : "—"}
                      </td>
                    )}
                    {received && (
                      <td
                        className={`whitespace-nowrap px-2 py-3 text-right align-top tabular-nums ${differs ? "text-warning" : ""}`}
                      >
                        {line.received_quantity != null ? formatQuantityWithUnit(line.received_quantity, line.unit) : "—"}
                      </td>
                    )}
                    {received && (
                      <td className="px-2 py-3 align-top text-xs text-muted">
                        {[line.lot && `Lote ${line.lot}`, line.expires_on && `Vence ${formatDate(line.expires_on)}`]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                    )}
                    {priced && (
                      <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums">
                        {line.total_cents != null ? formatSoles(line.total_cents) : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {priced && purchase.total_cents != null && (
              <tfoot className="border-t border-line">
                <tr>
                  <th scope="row" colSpan={received ? 5 : 3} className="px-4 py-3 text-right font-medium">
                    {received ? "Total recibido" : "Total pedido"}
                  </th>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                    {formatSoles(purchase.total_cents)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-line bg-surface p-5 text-sm">
            <h2 className="mb-3 font-semibold">Seguimiento</h2>
            <dl className="space-y-2">
              {timeline
                .filter(([, at]) => at)
                .map(([label, at]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-right">{formatDateTimeLima(at!)}</dd>
                  </div>
                ))}
              {purchase.invoice_number && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Factura o boleta</dt>
                  <dd>{purchase.invoice_number}</dd>
                </div>
              )}
            </dl>
            {received && purchase.expense_movement_id && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-success">
                <Icon name="check" className="size-4" />
                Egreso registrado
              </p>
            )}
          </section>
          {purchase.notes && (
            <section className="rounded-xl border border-line bg-surface p-5 text-sm">
              <h2 className="mb-2 font-semibold">Notas</h2>
              <p className="whitespace-pre-line">{purchase.notes}</p>
            </section>
          )}
          {purchase.cancel_reason && (
            <section className="rounded-xl border border-danger/30 bg-danger/5 p-5 text-sm">
              <h2 className="mb-2 font-semibold text-danger">Cancelada</h2>
              <p>{purchase.cancel_reason}</p>
            </section>
          )}
        </aside>
      </div>

      {action === "order" && (
        <OrderForm
          purchase={purchase}
          onClose={() => setAction(null)}
          onSaved={(updated) => done(updated, `Compra ordenada a ${updated.supplier_name ?? "el proveedor"}.`)}
        />
      )}
      {action === "receive" && (
        <ReceiveForm
          purchase={purchase}
          onClose={() => setAction(null)}
          onSaved={(updated) => done(updated, "Compra recibida: las cantidades ya están en el almacén.")}
        />
      )}
      {action === "expense" && (
        <ExpenseForm
          purchase={purchase}
          onClose={() => setAction(null)}
          onSaved={(updated) => done(updated, "Egreso registrado en Caja.")}
        />
      )}
      {action === "cancel" && (
        <VoidForm
          title={`Cancelar ${purchase.code}`}
          summary="La compra queda cancelada y ya no se puede ordenar ni recibir."
          confirmLabel="Cancelar compra"
          hint="No se borra: queda con el motivo y la fecha de cancelación."
          onSubmit={(reason) => cancel(purchase, reason)}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  );
}
