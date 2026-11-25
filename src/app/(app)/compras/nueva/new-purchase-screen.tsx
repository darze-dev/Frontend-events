"use client";

// Nueva solicitud de compra (HU28): líneas con producto y cantidad, evento y notas opcionales
// (CA-28.1). "Agregar faltantes" trae los productos con stock bajo y la cantidad para volver al
// mínimo (CA-28.2); las cantidades se editan antes de guardar. Proveedor y costos van al ordenar.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { EventPicker, type PickedEvent } from "@/app/(app)/caja/event-picker";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Product } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { UNITS, formatQuantity, formatQuantityWithUnit, isPositive, parseQuantity } from "@/lib/inventory";

type Line = { key: number; productId: string; quantity: string; hint?: string };

let nextKey = 1;
const newLine = (productId = "", quantity = "", hint?: string): Line => ({ key: nextKey++, productId, quantity, hint });

export function NewPurchaseScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [linkedEvent, setLinkedEvent] = useState<PickedEvent | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingShortages, setLoadingShortages] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api.GET("/v1/inventory/products").then(({ data }) => setProducts(data ?? []));
  }, []);

  const update = (key: number, change: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)));

  async function addShortages() {
    setLoadingShortages(true);
    setError(null);
    const { data, error: apiError } = await api.GET("/v1/purchasing/shortages");
    setLoadingShortages(false);
    if (!data) return setError(errorMessage(apiError));
    const present = new Set(lines.map((line) => line.productId).filter(Boolean));
    const added = data
      .filter((shortage) => !present.has(shortage.product_id))
      .map((shortage) =>
        newLine(
          shortage.product_id,
          formatQuantity(shortage.suggested_quantity).replace(/,/g, ""),
          `Stock ${formatQuantityWithUnit(shortage.stock, shortage.unit)} · mínimo ${formatQuantityWithUnit(shortage.min_stock, shortage.unit)}`,
        ),
      );
    setLines((current) => [...current.filter((line) => line.productId || line.quantity), ...added]);
    setNotice(
      data.length === 0
        ? "No hay productos con stock bajo."
        : added.length === 0
          ? "Los productos con stock bajo ya están en la solicitud."
          : `Se agregaron ${added.length} ${added.length === 1 ? "producto" : "productos"} con stock bajo. Revisa las cantidades.`,
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const filled = lines.filter((line) => line.productId || line.quantity);
    if (filled.length === 0) return setError("Agrega al menos un producto.");
    const body = [];
    for (const line of filled) {
      const quantity = parseQuantity(line.quantity);
      if (!line.productId) return setError("Elige el producto de cada línea.");
      if (quantity === null || !isPositive(quantity))
        return setError("Cada cantidad debe ser mayor que cero, con hasta 3 decimales.");
      body.push({ product_id: line.productId, quantity });
    }
    if (new Set(body.map((line) => line.product_id)).size !== body.length)
      return setError("Hay un producto repetido: junta las cantidades en una sola línea.");
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/purchasing/purchases", {
      body: { lines: body, event_id: linkedEvent?.id ?? null, notes: notes.trim() || null },
    });
    setSaving(false);
    if (data) router.push(`/compras/${data.id}`);
    else setError(errorMessage(apiError));
  }

  const productById = new Map(products.map((p) => [p.id, p]));

  return (
    <form onSubmit={submit} className="space-y-6">
      <header className="space-y-4">
        <Link href="/compras" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Compras
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Nueva solicitud de compra</h1>
          <p className="mt-1 text-sm text-muted">El proveedor y los costos se eligen al ordenar.</p>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">Productos</h2>
          <button type="button" onClick={() => void addShortages()} disabled={loadingShortages} className={secondaryButton}>
            <Icon name="box" className="size-4" />
            {loadingShortages ? "Buscando faltantes…" : "Agregar faltantes"}
          </button>
        </div>
        {notice && (
          <p role="status" className="rounded-lg bg-primary-soft p-3 text-sm text-primary">
            {notice}
          </p>
        )}
        <ul className="space-y-3">
          {lines.map((line, index) => {
            const product = productById.get(line.productId);
            return (
              <li key={line.key} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
                <label className={labelClass}>
                  Producto {index + 1}
                  <select
                    value={line.productId}
                    onChange={(e) => update(line.key, { productId: e.target.value, hint: undefined })}
                    className={fieldClass}
                  >
                    <option value="">Elige un producto…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} · {p.name}
                      </option>
                    ))}
                  </select>
                  {(line.hint || product) && (
                    <span className="mt-1 block text-xs font-normal text-muted">
                      {line.hint ??
                        (product &&
                          `Stock ${formatQuantityWithUnit(product.stock, product.unit)} · mínimo ${formatQuantityWithUnit(product.min_stock, product.unit)}`)}
                    </span>
                  )}
                </label>
                <label className={labelClass}>
                  Cantidad{product && ` (${UNITS[product.unit].plural})`}
                  <input
                    value={line.quantity}
                    onChange={(e) => update(line.key, { quantity: e.target.value })}
                    inputMode="decimal"
                    placeholder="0"
                    className={fieldClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                  disabled={lines.length === 1}
                  aria-label={`Quitar producto ${index + 1}`}
                  className="mb-1 inline-flex items-center justify-center rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                >
                  <Icon name="trash" className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => setLines((current) => [...current, newLine()])}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Icon name="plus" className="size-4" />
          Agregar producto
        </button>
      </section>

      <section className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
        <div className={labelClass}>
          <span aria-hidden="true">
            Evento <span className="font-normal text-muted">(opcional)</span>
          </span>
          <EventPicker value={linkedEvent} onChange={setLinkedEvent} label="Evento para el que se compra (opcional)" />
        </div>
        <label className={labelClass}>
          Notas <span className="font-normal text-muted">(opcional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} className={fieldClass} />
        </label>
      </section>

      {error && <ErrorAlert message={error} />}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/compras" className={secondaryButton}>
          Cancelar
        </Link>
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? "Guardando…" : "Guardar solicitud"}
        </button>
      </div>
    </form>
  );
}
