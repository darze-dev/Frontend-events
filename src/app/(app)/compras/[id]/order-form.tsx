"use client";

// Ordenar una solicitud (CA-29.1): se elige el proveedor (activo) y el costo unitario de cada
// línea, en soles. El total se calcula aquí solo como referencia: el oficial lo da el backend.
import { useEffect, useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Purchase, type Supplier } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatQuantityWithUnit, toMilli } from "@/lib/inventory";
import { formatSoles, solesToCents } from "@/lib/money";

type Props = { purchase: Purchase; onSaved: (purchase: Purchase) => void; onClose: () => void };

export function OrderForm({ purchase, onSaved, onClose }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api.GET("/v1/purchasing/suppliers").then(({ data }) => setSuppliers(data ?? []));
  }, []);

  const total = purchase.lines.reduce((sum, line) => {
    const cents = solesToCents(costs[line.product_id] ?? "");
    return cents === null ? sum : sum + Math.round((cents * toMilli(line.quantity)) / 1000);
  }, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supplierId = String(new FormData(event.currentTarget).get("supplier_id") ?? "");
    if (!supplierId) return setError("Elige el proveedor.");
    const lines = [];
    for (const line of purchase.lines) {
      const cents = solesToCents(costs[line.product_id] ?? "");
      if (cents === null) return setError(`Escribe el costo unitario de ${line.product_name ?? "cada producto"} en soles (ej.: 3.50).`);
      lines.push({ product_id: line.product_id, unit_cost_cents: cents });
    }
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/purchasing/purchases/{purchase_id}/order", {
      params: { path: { purchase_id: purchase.id } },
      body: { supplier_id: supplierId, lines },
    });
    setSaving(false);
    if (data) onSaved(data);
    else setError(errorMessage(apiError));
  }

  return (
    <Modal title={`Ordenar ${purchase.code}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className={labelClass}>
          Proveedor <span className="text-danger">*</span>
          <select name="supplier_id" required autoFocus defaultValue="" className={fieldClass}>
            <option value="">{suppliers === null ? "Cargando proveedores…" : "Elige un proveedor…"}</option>
            {(suppliers ?? []).map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name} · {supplier.document_type} {supplier.document_number}
              </option>
            ))}
          </select>
          {suppliers?.length === 0 && (
            <span className="mt-1 block text-xs font-normal text-muted">No hay proveedores activos: regístralo en Proveedores.</span>
          )}
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Costo unitario por producto (S/)</legend>
          {purchase.lines.map((line) => (
            <label key={line.product_id} className="grid grid-cols-[1fr_8rem] items-center gap-3 text-sm">
              <span>
                {line.product_name ?? "Producto"}
                <span className="block text-xs text-muted">{formatQuantityWithUnit(line.quantity, line.unit)}</span>
              </span>
              <input
                value={costs[line.product_id] ?? ""}
                onChange={(e) => setCosts((current) => ({ ...current, [line.product_id]: e.target.value }))}
                inputMode="decimal"
                required
                placeholder="0.00"
                aria-label={`Costo unitario de ${line.product_name ?? "producto"} en soles`}
                className={`${fieldClass} mt-0 text-right`}
              />
            </label>
          ))}
        </fieldset>
        <p className="flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-muted">Total estimado</span>
          <span className="font-semibold tabular-nums">{formatSoles(total)}</span>
        </p>

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Volver
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : "Ordenar compra"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
