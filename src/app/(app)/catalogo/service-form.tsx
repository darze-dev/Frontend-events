"use client";

// Formulario para registrar o modificar un servicio (HU06), en una ventana.
// El precio se escribe en soles y se envía en céntimos.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Category, type PriceUnit, type Service } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { centsToSolesText, solesToCents } from "@/lib/money";

type Props = {
  service: Service | null; // null = servicio nuevo
  categories: Category[];
  onSaved: () => void;
  onClose: () => void;
};

export function ServiceForm({ service, categories, onSaved, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = service === null;
  // Solo categorías activas; al editar se mantiene la actual aunque esté desactivada.
  const options = categories.filter((c) => c.active || c.id === service?.category_id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const cents = solesToCents(text("price"));
    if (cents === null) {
      setError("Escribe el precio en soles, con hasta 2 decimales. Ejemplo: 45.50");
      return;
    }
    if (!text("category_id")) {
      setError("Elige una categoría.");
      return;
    }
    const body = {
      name: text("name"),
      category_id: text("category_id"),
      price_unit: (text("price_unit") === "PER_PERSON" ? "PER_PERSON" : "PER_UNIT") as PriceUnit,
      reference_price_cents: cents,
      description: text("description") || null,
    };

    setSaving(true);
    setError(null);
    try {
      const { error: apiError } = isNew
        ? await api.POST("/v1/catalog/services", { body })
        : await api.PUT("/v1/catalog/services/{service_id}", {
            params: { path: { service_id: service.id } },
            body,
          });
      if (apiError) setError(errorMessage(apiError));
      else onSaved();
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? "Nuevo servicio" : "Editar servicio"} onClose={onClose}>
      {options.length === 0 ? (
        <p className="text-sm text-muted">
          Primero crea una categoría en la pestaña <strong>Categorías</strong>: cada servicio pertenece a una.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className={labelClass}>
            Nombre del servicio <span className="text-danger">*</span>
            <input name="name" required autoFocus defaultValue={service?.name} className={fieldClass} />
          </label>

          <label className={labelClass}>
            Categoría <span className="text-danger">*</span>
            <select name="category_id" required defaultValue={service?.category_id ?? ""} className={fieldClass}>
              <option value="" disabled>
                Elige una categoría
              </option>
              {options.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.active ? "" : " (desactivada)"}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-sm font-medium">
              ¿Cómo se cobra? <span className="text-danger">*</span>
            </legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(
                [
                  ["PER_PERSON", "Por persona", "Buffet: se multiplica por invitados"],
                  ["PER_UNIT", "Por unidad", "Mobiliario, decoración…"],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className="flex cursor-pointer gap-2 rounded-lg border border-line p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
                >
                  <input
                    type="radio"
                    name="price_unit"
                    value={value}
                    defaultChecked={(service?.price_unit ?? "PER_UNIT") === value}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className={labelClass}>
            Precio referencial (S/) <span className="text-danger">*</span>
            <input
              name="price"
              required
              inputMode="decimal"
              placeholder="45.00"
              defaultValue={service ? centsToSolesText(service.reference_price_cents) : ""}
              className={fieldClass}
            />
            <span className="mt-1 block text-xs font-normal text-muted">
              La cotización copia este precio y se puede ajustar en cada cotización.
            </span>
          </label>

          <label className={labelClass}>
            Descripción
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              defaultValue={service?.description ?? ""}
              className={fieldClass}
            />
          </label>

          {error && <ErrorAlert message={error} />}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={secondaryButton}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? "Guardando…" : isNew ? "Registrar servicio" : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
