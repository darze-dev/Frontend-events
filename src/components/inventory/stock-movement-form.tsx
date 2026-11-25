"use client";

// Registrar un movimiento de almacén (HU23, HU26). Los movimientos no se editan ni se borran
// (R-INV-5): un error se corrige con un ajuste.
// - Entrada: cantidad, costo unitario en soles, proveedor opcional (solo con `purchasing:manage`,
//   que es quien ve la lista de proveedores), lote y vencimiento opcionales (CA-23.2).
// - Salida / Devolución: evento (programado, confirmado o en ejecución) y cantidad (CA-26.1, CA-26.3).
// - Merma: cantidad y motivo; evento opcional (CA-26.4).
// - Ajuste: signo, cantidad y motivo.
import { useEffect, useState, type FormEvent } from "react";

import { EventPicker, type PickedEvent } from "@/app/(app)/caja/event-picker";
import { useAuth } from "@/components/auth-provider";
import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Product, type RecordedMovement, type StockMovementKind, type Supplier } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { MOVEMENT_KINDS, UNITS, formatQuantityWithUnit, isPositive, parseQuantity } from "@/lib/inventory";
import { solesToCents } from "@/lib/money";
import { todayInLima } from "@/lib/quotes";

export type MovementProduct = Pick<Product, "id" | "name" | "unit"> & { stock?: string };

type Props = {
  kind: StockMovementKind;
  product: MovementProduct | null; // null: se elige en el formulario
  event?: PickedEvent | null;
  lockEvent?: boolean; // desde la pestaña Materiales: el evento no se cambia
  onSaved: (result: RecordedMovement, product: MovementProduct) => void;
  onClose: () => void;
};

const TITLES: Record<StockMovementKind, string> = {
  ENTRY: "Registrar entrada",
  EXIT: "Registrar salida",
  RETURN: "Registrar devolución",
  WASTE: "Registrar merma",
  ADJUSTMENT: "Registrar ajuste",
};

export function StockMovementForm({ kind, product, event = null, lockEvent = false, onSaved, onClose }: Props) {
  const { can } = useAuth();
  const today = todayInLima();
  const [products, setProducts] = useState<MovementProduct[]>([]);
  const [productId, setProductId] = useState(product?.id ?? "");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [linkedEvent, setLinkedEvent] = useState<PickedEvent | null>(event);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const withEvent = kind === "EXIT" || kind === "RETURN";
  const canPickSupplier = kind === "ENTRY" && can("purchasing:manage");
  const selected = product ?? products.find((p) => p.id === productId) ?? null;

  useEffect(() => {
    if (product) return;
    void api.GET("/v1/inventory/products").then(({ data }) => setProducts(data ?? []));
  }, [product]);

  useEffect(() => {
    if (!canPickSupplier) return;
    void api.GET("/v1/purchasing/suppliers").then(({ data }) => setSuppliers(data ?? []));
  }, [canPickSupplier]);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!selected) return setError("Elige el producto.");
    const quantity = parseQuantity(text("quantity"));
    if (quantity === null || !isPositive(quantity))
      return setError("Escribe una cantidad mayor que cero, con hasta 3 decimales (ej.: 12.5).");
    const occurredOn = text("occurred_on") || null;
    if (occurredOn && occurredOn > today) return setError("La fecha no puede ser posterior a hoy.");
    if (withEvent && !linkedEvent) return setError("Elige el evento.");
    const reason = text("reason");
    if ((kind === "WASTE" || kind === "ADJUSTMENT") && !reason) return setError("Indica el motivo.");

    const base = { product_id: selected.id, quantity, occurred_on: occurredOn };
    setSaving(true);
    setError(null);
    try {
      let response;
      if (kind === "ENTRY") {
        const cost = solesToCents(text("unit_cost"));
        if (cost === null) {
          setSaving(false);
          return setError("Escribe el costo unitario en soles, de cero o más (ej.: 3.50).");
        }
        response = await api.POST("/v1/inventory/movements/entry", {
          body: {
            ...base,
            unit_cost_cents: cost,
            supplier_id: text("supplier_id") || null,
            lot: text("lot") || null,
            expires_on: text("expires_on") || null,
            reason: reason || null,
          },
        });
      } else if (kind === "EXIT" || kind === "RETURN") {
        const body = { ...base, event_id: linkedEvent!.id, reason: reason || null };
        response =
          kind === "EXIT"
            ? await api.POST("/v1/inventory/movements/exit", { body })
            : await api.POST("/v1/inventory/movements/return", { body });
      } else if (kind === "WASTE") {
        response = await api.POST("/v1/inventory/movements/waste", {
          body: { ...base, reason, event_id: linkedEvent?.id ?? null },
        });
      } else {
        const sign = text("sign") === "-" ? "-" : "";
        response = await api.POST("/v1/inventory/movements/adjustment", {
          body: { ...base, quantity: `${sign}${quantity}`, reason },
        });
      }
      if (response.data) onSaved(response.data, selected);
      else setError(errorMessage(response.error));
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  const unitLabel = selected ? UNITS[selected.unit].plural : "";

  return (
    <Modal title={TITLES[kind]} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {product ? (
          <p className="text-sm">
            <span className="font-medium">{product.name}</span>
            {product.stock !== undefined && (
              <span className="text-muted"> · stock actual: {formatQuantityWithUnit(product.stock, product.unit)}</span>
            )}
          </p>
        ) : (
          <label className={labelClass}>
            Producto <span className="text-danger">*</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              autoFocus
              className={fieldClass}
            >
              <option value="">Elige un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.stock !== undefined ? ` (${formatQuantityWithUnit(p.stock, p.unit)})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {(withEvent || kind === "WASTE") && (
          <div className={labelClass}>
            <span aria-hidden="true">
              Evento {withEvent ? <span className="text-danger">*</span> : <span className="font-normal text-muted">(opcional)</span>}
            </span>
            {lockEvent && linkedEvent ? (
              <p className="mt-1.5 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm font-normal">
                {linkedEvent.label}
              </p>
            ) : (
              <EventPicker
                value={linkedEvent}
                onChange={setLinkedEvent}
                label={withEvent ? "Evento" : "Evento donde se perdió (opcional)"}
              />
            )}
            {kind === "EXIT" && (
              <span className="mt-1 block text-xs font-normal text-muted">
                Solo para eventos programados, confirmados o en ejecución.
              </span>
            )}
            {kind === "WASTE" && (
              <span className="mt-1 block text-xs font-normal text-muted">
                Si se perdió en un evento, elígelo: descuenta de lo que salió y no del almacén.
              </span>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {kind === "ADJUSTMENT" && (
            <label className={labelClass}>
              Tipo de ajuste <span className="text-danger">*</span>
              <select name="sign" defaultValue="+" className={fieldClass}>
                <option value="+">Sumar al stock (+)</option>
                <option value="-">Restar del stock (−)</option>
              </select>
            </label>
          )}
          <label className={labelClass}>
            Cantidad{unitLabel && ` (${unitLabel})`} <span className="text-danger">*</span>
            <input
              name="quantity"
              inputMode="decimal"
              required
              placeholder="0"
              autoFocus={Boolean(product) && !withEvent}
              className={fieldClass}
            />
          </label>
          {kind === "ENTRY" && (
            <label className={labelClass}>
              Costo unitario (S/) <span className="text-danger">*</span>
              <input name="unit_cost" inputMode="decimal" required placeholder="0.00" className={fieldClass} />
            </label>
          )}
          <label className={labelClass}>
            Fecha
            <input name="occurred_on" type="date" max={today} defaultValue={today} className={fieldClass} />
          </label>
        </div>

        {kind === "ENTRY" && (
          <>
            {canPickSupplier && (
              <label className={labelClass}>
                Proveedor <span className="font-normal text-muted">(opcional)</span>
                <select name="supplier_id" defaultValue="" className={fieldClass}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Lote <span className="font-normal text-muted">(opcional)</span>
                <input name="lot" maxLength={50} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Vencimiento <span className="font-normal text-muted">(opcional)</span>
                <input name="expires_on" type="date" className={fieldClass} />
              </label>
            </div>
          </>
        )}

        <label className={labelClass}>
          {kind === "WASTE" || kind === "ADJUSTMENT" ? (
            <>
              Motivo <span className="text-danger">*</span>
            </>
          ) : (
            <>
              Observación <span className="font-normal text-muted">(opcional)</span>
            </>
          )}
          <textarea
            name="reason"
            rows={2}
            maxLength={500}
            required={kind === "WASTE" || kind === "ADJUSTMENT"}
            className={fieldClass}
          />
        </label>
        {kind === "ADJUSTMENT" && (
          <p className="text-xs text-muted">Los movimientos no se editan: el ajuste corrige un error y queda con su motivo.</p>
        )}

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Volver
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : `Registrar ${MOVEMENT_KINDS[kind].label.toLowerCase()}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
