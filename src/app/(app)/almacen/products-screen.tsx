"use client";

// Almacén (HU23): productos con su stock, costo promedio y alertas "Stock bajo" / "Por vencer"
// (CA-23.5). Búsqueda por código o nombre y filtros por categoría, tipo, estado y alertas.
// Con `inventory:manage`: registrar, editar, desactivar y reactivar (CA-23.3: no se elimina).
// El nombre abre el detalle con el historial y los botones de movimientos.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { fieldClass, labelClass, primaryButton } from "@/components/ui/styles";
import { api, type Product, type ProductCategory, type ProductKind } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { CATEGORIES, PRODUCT_KINDS, formatQuantityWithUnit } from "@/lib/inventory";
import { formatSoles } from "@/lib/money";

import { ProductForm } from "./product-form";
import { StockAlerts } from "./stock-alerts";

type StatusFilter = "active" | "inactive" | "all";

export function ProductsScreen() {
  const { can } = useAuth();
  const canManage = can("inventory:manage");
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [kind, setKind] = useState<ProductKind | "">("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/inventory/products", {
        params: {
          query: { text, category: category || null, include_inactive: status !== "active", alerts_only: alertsOnly },
        },
      });
      setProducts(data ?? []);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setError(errorMessage(null));
    } finally {
      setLoading(false);
    }
  }, [text, category, status, alertsOnly]);

  // Busca 300 ms después de la última tecla, para no llamar a la API en cada letra.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  // El tipo y "solo desactivados" se filtran aquí: la API no los recibe.
  const visible = products.filter(
    (product) => (!kind || product.kind === kind) && (status !== "inactive" || !product.active),
  );
  const filtered = Boolean(text.trim() || category || kind || status !== "active" || alertsOnly);

  async function changeStatus(product: Product) {
    const params = { path: { product_id: product.id } };
    const { error: apiError } = product.active
      ? await api.POST("/v1/inventory/products/{product_id}/deactivate", { params })
      : await api.POST("/v1/inventory/products/{product_id}/activate", { params });
    setDeactivating(null);
    if (apiError) setError(errorMessage(apiError));
    else await load();
  }

  const onStatusClick = (product: Product) =>
    product.active ? setDeactivating(product) : void changeStatus(product);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Almacén</h1>
          <p className="mt-1 text-sm text-muted">Insumos, vajilla y mantelería: cuánto hay, cuánto vale y qué falta.</p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setEditing("new")} className={primaryButton}>
            <Icon name="plus" className="size-4" />
            Nuevo producto
          </button>
        )}
      </header>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
          <span className="sr-only">Buscar productos</span>
          <span className="relative block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 mt-[3px] size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Buscar por código o nombre"
              className={`${fieldClass} pl-9`}
            />
          </span>
        </label>
        <label className={labelClass}>
          Categoría
          <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory | "")} className={fieldClass}>
            <option value="">Todas</option>
            {(Object.keys(CATEGORIES) as ProductCategory[]).map((value) => (
              <option key={value} value={value}>
                {CATEGORIES[value]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value as ProductKind | "")} className={fieldClass}>
            <option value="">Todos</option>
            {(Object.keys(PRODUCT_KINDS) as ProductKind[]).map((value) => (
              <option key={value} value={value}>
                {PRODUCT_KINDS[value].label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={fieldClass}>
            <option value="active">Activos</option>
            <option value="inactive">Desactivados</option>
            <option value="all">Todos</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={alertsOnly}
            onChange={(event) => setAlertsOnly(event.target.checked)}
            className="size-4 accent-primary"
          />
          Solo con alertas
        </label>
      </div>

      {error && <ErrorAlert message={error} />}

      {loading && products.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando productos…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="box" />
          </span>
          <p className="font-medium">{filtered ? "Ningún producto coincide con los filtros" : "Todavía no hay productos"}</p>
          <p className="mt-1 text-sm text-muted">
            {filtered ? "Prueba con otro código, nombre o filtro." : "Registra los productos del almacén para controlar su stock."}
          </p>
        </div>
      ) : (
        <>
          {/* Computadora y tablet */}
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Producto</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Categoría</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Stock</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-medium lg:table-cell">Mínimo</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Costo prom.</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  {canManage && (
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((product) => (
                  <tr key={product.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/almacen/${product.id}`} className="font-medium text-primary hover:underline">
                        {product.name}
                      </Link>
                      <span className="block text-xs text-muted">
                        {product.code} · {PRODUCT_KINDS[product.kind].label}
                      </span>
                      <span className="mt-1 block">
                        <StockAlerts product={product} />
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">{CATEGORIES[product.category]}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                      {formatQuantityWithUnit(product.stock, product.unit)}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted lg:table-cell">
                      {formatQuantityWithUnit(product.min_stock, product.unit)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatSoles(product.avg_cost_cents)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge active={product.active} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <RowActions product={product} onEdit={setEditing} onStatus={onStatusClick} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular */}
          <ul className="space-y-3 md:hidden">
            {visible.map((product) => (
              <li key={product.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/almacen/${product.id}`} className="font-medium text-primary hover:underline">
                      {product.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {product.code} · {CATEGORIES[product.category]}
                    </p>
                  </div>
                  <StatusBadge active={product.active} />
                </div>
                <div className="mt-2">
                  <StockAlerts product={product} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Stock</dt>
                    <dd className="font-medium tabular-nums">{formatQuantityWithUnit(product.stock, product.unit)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Costo promedio</dt>
                    <dd className="tabular-nums">{formatSoles(product.avg_cost_cents)}</dd>
                  </div>
                </dl>
                {canManage && (
                  <div className="mt-4 border-t border-line pt-3">
                    <RowActions product={product} onEdit={setEditing} onStatus={onStatusClick} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {editing !== null && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title="Desactivar producto"
          message={`"${deactivating.name}" dejará de aparecer en la lista y no tendrá nuevas entradas ni salidas. No se borra: su historial se conserva y puedes reactivarlo cuando quieras.`}
          confirmLabel="Desactivar"
          onConfirm={() => changeStatus(deactivating)}
          onClose={() => setDeactivating(null)}
        />
      )}
    </div>
  );
}

function RowActions({
  product,
  onEdit,
  onStatus,
}: {
  product: Product;
  onEdit: (product: Product) => void;
  onStatus: (product: Product) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(product)}
        aria-label={`Editar ${product.name}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-primary hover:bg-primary-soft"
      >
        <Icon name="pencil" className="size-4" />
        Editar
      </button>
      <button
        type="button"
        onClick={() => onStatus(product)}
        aria-label={`${product.active ? "Desactivar" : "Activar"} ${product.name}`}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-muted ${
          product.active ? "text-muted hover:text-danger" : "text-success"
        }`}
      >
        <Icon name="power" className="size-4" />
        {product.active ? "Desactivar" : "Activar"}
      </button>
    </div>
  );
}
