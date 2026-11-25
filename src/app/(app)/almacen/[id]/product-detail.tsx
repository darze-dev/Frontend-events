"use client";

// Detalle de un producto (HU23, HU26): stock actual (suma de movimientos, CA-23.4), costo
// promedio ponderado (R-INV-3), valor del stock, alertas e historial de movimientos.
// Con `inventory:manage`: Entrada, Salida, Devolución, Merma y Ajuste, y editar o desactivar.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { StockMovementForm } from "@/components/inventory/stock-movement-form";
import { useEventCodes } from "@/components/inventory/use-event-codes";
import { ErrorAlert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { Tag } from "@/components/ui/tag";
import { api, type Product, type StockMovement, type StockMovementKind } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatDateTimeLima } from "@/lib/events";
import { CATEGORIES, MOVEMENT_KINDS, PRODUCT_KINDS, formatQuantity, formatQuantityWithUnit, toMilli } from "@/lib/inventory";
import { formatSoles } from "@/lib/money";
import { formatDate, todayInLima } from "@/lib/quotes";

import { ProductForm } from "../product-form";
import { StockAlerts } from "../stock-alerts";

const PAGE_SIZE = 20;
const ACTIONS: StockMovementKind[] = ["ENTRY", "EXIT", "RETURN", "WASTE", "ADJUSTMENT"];

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const canManage = can("inventory:manage");
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recording, setRecording] = useState<StockMovementKind | null>(null);
  const [editing, setEditing] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const eventCodes = useEventCodes(movements.map((m) => m.event_id));

  const load = useCallback(async () => {
    const [productResponse, movementsResponse] = await Promise.all([
      api.GET("/v1/inventory/products/{product_id}", { params: { path: { product_id: id } } }),
      api.GET("/v1/inventory/products/{product_id}/movements", {
        params: { path: { product_id: id }, query: { page, page_size: PAGE_SIZE } },
      }),
    ]);
    if (productResponse.data) setProduct(productResponse.data);
    setMovements(movementsResponse.data?.items ?? []);
    setTotal(movementsResponse.data?.total ?? 0);
    const apiError = productResponse.error ?? movementsResponse.error;
    setError(apiError ? errorMessage(apiError) : null);
  }, [id, page]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Nombre del proveedor de las entradas: solo quien gestiona compras ve la lista.
  const canSeeSuppliers = can("purchasing:manage");
  useEffect(() => {
    if (!canSeeSuppliers) return;
    void api.GET("/v1/purchasing/suppliers", { params: { query: { include_inactive: true } } }).then(({ data }) => {
      setSuppliers(Object.fromEntries((data ?? []).map((s) => [s.id, s.name])));
    });
  }, [canSeeSuppliers]);

  async function changeStatus(current: Product) {
    const params = { path: { product_id: current.id } };
    const { data, error: apiError } = current.active
      ? await api.POST("/v1/inventory/products/{product_id}/deactivate", { params })
      : await api.POST("/v1/inventory/products/{product_id}/activate", { params });
    setDeactivating(false);
    if (data) setProduct(data);
    else setError(errorMessage(apiError));
  }

  if (!product) {
    return error ? <ErrorAlert message={error} /> : <p className="py-10 text-center text-sm text-muted">Cargando…</p>;
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const expired = product.next_expiry !== null && product.next_expiry < todayInLima();
  const cards: [string, string][] = [
    ["Stock actual", formatQuantityWithUnit(product.stock, product.unit)],
    ["Stock mínimo", formatQuantityWithUnit(product.min_stock, product.unit)],
    ["Costo promedio", formatSoles(product.avg_cost_cents)],
    ["Valor del stock", formatSoles(product.stock_value_cents)],
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link href="/almacen" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Almacén
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{product.name}</h1>
              <StatusBadge active={product.active} />
              <StockAlerts product={product} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {product.code} · {CATEGORIES[product.category]} · {PRODUCT_KINDS[product.kind].label}
              {product.next_expiry && (
                <span className={expired ? "text-danger" : ""}>
                  {" "}
                  · {expired ? "Venció" : "Próximo vencimiento"}: {formatDate(product.next_expiry)}
                </span>
              )}
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setEditing(true)} className={secondaryButton}>
                <Icon name="pencil" className="size-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => (product.active ? setDeactivating(true) : void changeStatus(product))}
                className={`${secondaryButton} ${product.active ? "hover:text-danger" : "text-success"}`}
              >
                <Icon name="power" className="size-4" />
                {product.active ? "Desactivar" : "Activar"}
              </button>
            </div>
          )}
        </div>
        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Icon name="check" className="size-4 shrink-0" />
            {notice}
          </div>
        )}
        {error && <ErrorAlert message={error} />}
      </header>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {canManage && product.active && (
        <section aria-label="Registrar movimiento" className="flex flex-wrap gap-2">
          {ACTIONS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setRecording(kind)}
              className={kind === "ENTRY" ? primaryButton : secondaryButton}
            >
              {kind === "ENTRY" && <Icon name="plus" className="size-4" />}
              {MOVEMENT_KINDS[kind].label}
            </button>
          ))}
        </section>
      )}
      {canManage && !product.active && (
        <p className="text-sm text-muted">El producto está desactivado: actívalo para registrar movimientos.</p>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Historial de movimientos</h2>
        {movements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            Todavía no hay movimientos. El stock sube con una entrada o al recibir una compra.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="border-b border-line bg-surface-muted/50 text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Fecha</th>
                    <th scope="col" className="px-2 py-2.5 font-medium">Tipo</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-medium">Cantidad</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-medium">Costo unit.</th>
                    <th scope="col" className="px-2 py-2.5 font-medium">Detalle</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Registrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {movements.map((movement) => {
                    const delta = toMilli(movement.stock_delta);
                    return (
                      <tr key={movement.id}>
                        <td className="whitespace-nowrap px-4 py-3 align-top">{formatDate(movement.occurred_on)}</td>
                        <td className="px-2 py-3 align-top">
                          <Tag {...MOVEMENT_KINDS[movement.kind]} />
                        </td>
                        <td
                          className={`whitespace-nowrap px-2 py-3 text-right align-top font-medium tabular-nums ${
                            delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-muted"
                          }`}
                          title={delta === 0 ? "No cambió el stock del almacén (merma de lo que salió al evento)" : undefined}
                        >
                          {delta > 0 ? "+" : ""}
                          {delta === 0 ? formatQuantity(movement.quantity) : formatQuantity(movement.stock_delta)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums">
                          {movement.unit_cost_cents != null ? formatSoles(movement.unit_cost_cents) : "—"}
                        </td>
                        <td className="px-2 py-3 align-top text-xs text-muted">
                          <MovementDetails
                            movement={movement}
                            eventCode={eventCodes}
                            suppliers={suppliers}
                            canSeePurchases={canSeeSuppliers}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-muted">
                          {formatDateTimeLima(movement.recorded_at)}
                        </td>
                      </tr>
                    );
                  })}
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
      </section>

      {recording && (
        <StockMovementForm
          kind={recording}
          product={product}
          onClose={() => setRecording(null)}
          onSaved={(result) => {
            setNotice(
              `${MOVEMENT_KINDS[recording].label} ${recording === "ADJUSTMENT" ? "registrado" : "registrada"}. Stock actual: ${formatQuantityWithUnit(result.stock, product.unit)}.`,
            );
            setRecording(null);
            if (page === 1) void load();
            else setPage(1);
          }}
        />
      )}
      {editing && (
        <ProductForm
          product={product}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setProduct(updated);
            setEditing(false);
            setNotice("Producto actualizado.");
          }}
        />
      )}
      {deactivating && (
        <ConfirmDialog
          title="Desactivar producto"
          message={`"${product.name}" no tendrá nuevas entradas ni salidas. No se borra: su historial se conserva y puedes reactivarlo.`}
          confirmLabel="Desactivar"
          onConfirm={() => changeStatus(product)}
          onClose={() => setDeactivating(false)}
        />
      )}
    </div>
  );
}

function MovementDetails({
  movement,
  eventCode,
  suppliers,
  canSeePurchases,
}: {
  movement: StockMovement;
  eventCode: Record<string, string>;
  suppliers: Record<string, string>;
  canSeePurchases: boolean;
}) {
  const parts: ReactNode[] = [];
  if (movement.event_id)
    parts.push(
      <Link key="event" href={`/eventos/${movement.event_id}`} className="text-primary hover:underline">
        {eventCode[movement.event_id] ?? "Evento"}
      </Link>,
    );
  if (movement.purchase_id && canSeePurchases)
    parts.push(
      <Link key="purchase" href={`/compras/${movement.purchase_id}`} className="text-primary hover:underline">
        Compra
      </Link>,
    );
  if (movement.supplier_id && suppliers[movement.supplier_id]) parts.push(suppliers[movement.supplier_id]);
  if (movement.lot) parts.push(`Lote ${movement.lot}`);
  if (movement.expires_on) parts.push(`Vence ${formatDate(movement.expires_on)}`);
  return (
    <>
      {parts.length > 0 && (
        <span className="block">
          {parts.map((part, index) => (
            <span key={index}>
              {index > 0 && " · "}
              {part}
            </span>
          ))}
        </span>
      )}
      {movement.reason && <span className="block text-fg">{movement.reason}</span>}
      {parts.length === 0 && !movement.reason && "—"}
    </>
  );
}
