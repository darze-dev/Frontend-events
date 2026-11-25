"use client";

// Compras (HU28, HU29): solicitudes y compras por estado (RN21: solicitada → ordenada →
// recibida | cancelada), de la más reciente a la más antigua. "Nueva solicitud" abre el
// formulario con "Agregar faltantes"; el código abre el detalle para ordenar, recibir o cancelar.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { useEventCodes } from "@/components/inventory/use-event-codes";
import { ErrorAlert } from "@/components/ui/alert";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Purchase, type PurchaseStatus } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatDateTimeLima } from "@/lib/events";
import { PURCHASE_STATUS } from "@/lib/inventory";
import { formatSoles } from "@/lib/money";

import { PurchaseStatusBadge } from "./purchase-status-badge";

const PAGE_SIZE = 20;
const FILTERS: { value: PurchaseStatus | ""; label: string }[] = [
  { value: "", label: "Todas" },
  ...(Object.keys(PURCHASE_STATUS) as PurchaseStatus[]).map((value) => ({
    value,
    label: `${PURCHASE_STATUS[value].label}s`,
  })),
];

export function PurchasesScreen() {
  const [status, setStatus] = useState<PurchaseStatus | "">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventCodes = useEventCodes(items.map((p) => p.event_id));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/purchasing/purchases", {
        params: { query: { status: status || null, page, page_size: PAGE_SIZE } },
      });
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setError(errorMessage(null));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compras</h1>
          <p className="mt-1 text-sm text-muted">
            Solicitudes, órdenes a proveedores y recepciones. El stock sube solo al recibir.
          </p>
        </div>
        <Link href="/compras/nueva" className={primaryButton}>
          <Icon name="plus" className="size-4" />
          Nueva solicitud
        </Link>
      </header>

      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={status === filter.value}
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              status === filter.value
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-muted hover:text-fg"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <ErrorAlert message={error} />}

      {loading && items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando compras…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="cart" />
          </span>
          <p className="font-medium">{status ? "No hay compras con ese estado" : "Todavía no hay compras"}</p>
          <p className="mt-1 text-sm text-muted">Crea una solicitud; “Agregar faltantes” propone lo que está bajo el mínimo.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line bg-surface-muted/50 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Código</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Estado</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Proveedor</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-medium">Líneas</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-medium">Total</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3 align-top">
                      <Link href={`/compras/${purchase.id}`} className="font-medium text-primary hover:underline">
                        {purchase.code}
                      </Link>
                      {purchase.event_id && (
                        <span className="block text-xs text-muted">
                          Para {eventCodes[purchase.event_id] ?? "evento"}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 align-top">
                      <PurchaseStatusBadge status={purchase.status} />
                    </td>
                    <td className="px-2 py-3 align-top">{purchase.supplier_name ?? <span className="text-muted">—</span>}</td>
                    <td className="px-2 py-3 text-right align-top tabular-nums">{purchase.lines.length}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums">
                      {purchase.total_cents != null ? formatSoles(purchase.total_cents) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-muted">{formatDateTimeLima(purchase.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <nav aria-label="Páginas" className="flex items-center justify-between text-sm">
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
          )}
        </>
      )}
    </div>
  );
}
