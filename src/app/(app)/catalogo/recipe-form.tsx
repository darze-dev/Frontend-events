"use client";

// Insumos de un servicio (HU24): qué productos del almacén gasta y cuánto, por invitado o por
// unidad contratada. Guardar reemplaza la lista completa; un producto aparece una sola vez.
import { useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Product, type Service } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { UNITS, formatQuantity, parseQuantity } from "@/lib/inventory";

type Basis = "PER_PERSON" | "PER_SERVICE";
type Row = { key: number; productId: string; quantity: string; basis: Basis };

export function RecipeForm({ service, canEdit, onClose }: { service: Service; canEdit: boolean; onClose: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [recipe, list] = await Promise.all([
          api.GET("/v1/inventory/recipes/{service_id}", { params: { path: { service_id: service.id } } }),
          api.GET("/v1/inventory/products"),
        ]);
        if (!alive) return;
        setProducts(list.data ?? []);
        if (recipe.data) {
          setRows(
            recipe.data.lines.map((line, i) => ({
              key: i,
              productId: line.product_id,
              quantity: formatQuantity(line.quantity),
              basis: line.basis,
            })),
          );
        } else {
          setRows([]);
          setError(errorMessage(recipe.error));
        }
      } catch {
        if (alive) {
          setRows([]);
          setError(errorMessage(null));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [service.id]);

  const active = products.filter((p) => p.active);
  const byId = new Map(products.map((p) => [p.id, p]));
  const update = (key: number, patch: Partial<Row>) => {
    setSaved(false);
    setRows((current) => (current ?? []).map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };
  const nextKey = () => Math.max(-1, ...(rows ?? []).map((r) => r.key)) + 1;

  async function save() {
    const lines = [];
    for (const row of rows ?? []) {
      const quantity = parseQuantity(row.quantity);
      if (!row.productId || !quantity || Number(quantity) <= 0) {
        setError("Cada fila necesita un producto y una cantidad mayor que cero (hasta 3 decimales).");
        return;
      }
      lines.push({ product_id: row.productId, quantity, basis: row.basis });
    }
    if (new Set(lines.map((l) => l.product_id)).size !== lines.length) {
      setError("Un producto solo puede aparecer una vez.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = await api.PUT("/v1/inventory/recipes/{service_id}", {
        params: { path: { service_id: service.id } },
        body: { lines },
      });
      if (data) setSaved(true);
      else setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Insumos · ${service.name}`} size="lg" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Lo que gasta este servicio del almacén. “Por persona” se multiplica por los invitados del evento;
          “por servicio”, por las unidades contratadas.
        </p>
        {error && <ErrorAlert message={error} />}
        {saved && (
          <div role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success">
            Insumos guardados.
          </div>
        )}
        {rows === null ? (
          <p className="py-6 text-center text-sm text-muted">Cargando insumos…</p>
        ) : rows.length === 0 && !canEdit ? (
          <p className="py-6 text-center text-sm text-muted">Este servicio no tiene insumos definidos.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const unit = byId.get(row.productId)?.unit;
              return (
                <div key={row.key} className="grid gap-2 sm:grid-cols-[1fr_7rem_9rem_auto] sm:items-center">
                  <select
                    aria-label="Producto"
                    value={row.productId}
                    disabled={!canEdit}
                    onChange={(e) => update(row.key, { productId: e.target.value })}
                    className={`${fieldClass} mt-0`}
                  >
                    <option value="">Elige un producto</option>
                    {products
                      .filter((p) => p.active || p.id === row.productId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({UNITS[p.unit].label})
                        </option>
                      ))}
                  </select>
                  <input
                    aria-label={`Cantidad${unit ? ` en ${UNITS[unit].plural}` : ""}`}
                    inputMode="decimal"
                    value={row.quantity}
                    disabled={!canEdit}
                    onChange={(e) => update(row.key, { quantity: e.target.value })}
                    className={`${fieldClass} mt-0 text-right tabular-nums`}
                  />
                  <select
                    aria-label="Base de cálculo"
                    value={row.basis}
                    disabled={!canEdit}
                    onChange={(e) => update(row.key, { basis: e.target.value as Basis })}
                    className={`${fieldClass} mt-0`}
                  >
                    <option value="PER_PERSON">Por persona</option>
                    <option value="PER_SERVICE">Por servicio</option>
                  </select>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setSaved(false);
                        setRows((current) => (current ?? []).filter((r) => r.key !== row.key));
                      }}
                      aria-label="Quitar fila"
                      className="justify-self-end rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-danger"
                    >
                      <Icon name="close" className="size-4" />
                    </button>
                  )}
                </div>
              );
            })}
            {rows.length === 0 && <p className="text-sm text-muted">Sin insumos todavía.</p>}
          </div>
        )}
        {canEdit && rows !== null && (
          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setSaved(false);
                setRows((current) => [...(current ?? []), { key: nextKey(), productId: "", quantity: "", basis: "PER_PERSON" }]);
              }}
              disabled={active.length === 0}
              className={secondaryButton}
            >
              <Icon name="plus" className="size-4" />
              Agregar insumo
            </button>
            <button type="button" onClick={() => void save()} disabled={saving} className={primaryButton}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
