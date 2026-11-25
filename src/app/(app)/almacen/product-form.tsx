"use client";

// Registrar o editar un producto del almacén (CA-23.1): código único (se guarda en mayúsculas),
// nombre, categoría y unidad de lista fija (R-INV-1, R-INV-2), tipo y stock mínimo.
// El stock no se escribe aquí: sale de los movimientos (CA-23.4).
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Product, type ProductCategory, type ProductKind, type Unit } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { CATEGORIES, PRODUCT_KINDS, UNITS, formatQuantity, parseQuantity } from "@/lib/inventory";

type Props = {
  product: Product | null; // null = producto nuevo
  onSaved: (product: Product) => void;
  onClose: () => void;
};

export function ProductForm({ product, onSaved, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = product === null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const minStock = parseQuantity(text("min_stock") || "0");
    if (minStock === null) return setError("El stock mínimo es una cantidad de cero o más, con hasta 3 decimales.");
    if (!text("code") || !text("name")) return setError("El código y el nombre son obligatorios.");
    const body = {
      code: text("code").toUpperCase(),
      name: text("name"),
      category: text("category") as ProductCategory,
      unit: text("unit") as Unit,
      kind: text("kind") as ProductKind,
      min_stock: minStock,
    };
    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = isNew
        ? await api.POST("/v1/inventory/products", { body })
        : await api.PUT("/v1/inventory/products/{product_id}", {
            params: { path: { product_id: product.id } },
            body,
          });
      if (data) onSaved(data);
      else setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? "Nuevo producto" : "Editar producto"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <label className={labelClass}>
            Código <span className="text-danger">*</span>
            <input
              name="code"
              required
              maxLength={20}
              autoFocus
              defaultValue={product?.code}
              className={`${fieldClass} uppercase`}
            />
          </label>
          <label className={`${labelClass} col-span-2`}>
            Nombre <span className="text-danger">*</span>
            <input name="name" required maxLength={120} defaultValue={product?.name} className={fieldClass} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Categoría <span className="text-danger">*</span>
            <select name="category" defaultValue={product?.category ?? "SUPPLIES"} className={fieldClass}>
              {(Object.keys(CATEGORIES) as ProductCategory[]).map((value) => (
                <option key={value} value={value}>
                  {CATEGORIES[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Unidad de medida <span className="text-danger">*</span>
            <select name="unit" defaultValue={product?.unit ?? "UNIT"} className={fieldClass}>
              {(Object.keys(UNITS) as Unit[]).map((value) => (
                <option key={value} value={value}>
                  {UNITS[value].label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Tipo <span className="text-danger">*</span>
            <select name="kind" defaultValue={product?.kind ?? "CONSUMABLE"} className={fieldClass} aria-describedby="kind-hint">
              {(Object.keys(PRODUCT_KINDS) as ProductKind[]).map((value) => (
                <option key={value} value={value}>
                  {PRODUCT_KINDS[value].label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Stock mínimo
            <input
              name="min_stock"
              inputMode="decimal"
              defaultValue={product ? formatQuantity(product.min_stock).replace(/,/g, "") : "0"}
              className={fieldClass}
              aria-describedby="min-hint"
            />
          </label>
        </div>
        <ul className="space-y-1 text-xs text-muted">
          <li id="kind-hint">
            Consumible: {PRODUCT_KINDS.CONSUMABLE.hint} Reutilizable: {PRODUCT_KINDS.REUSABLE.hint}
          </li>
          <li id="min-hint">Con el stock en el mínimo o debajo, el producto aparece con la alerta “Stock bajo”.</li>
        </ul>

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : isNew ? "Registrar producto" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
