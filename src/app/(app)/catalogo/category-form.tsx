"use client";

// Formulario para crear o renombrar una categoría (HU06), en una ventana.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Category } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = {
  category: Category | null; // null = categoría nueva
  onSaved: () => void;
  onClose: () => void;
};

export function CategoryForm({ category, onSaved, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = category === null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    setSaving(true);
    setError(null);
    try {
      const { error: apiError } = isNew
        ? await api.POST("/v1/catalog/categories", { body: { name } })
        : await api.PUT("/v1/catalog/categories/{category_id}", {
            params: { path: { category_id: category.id } },
            body: { name },
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
    <Modal title={isNew ? "Nueva categoría" : "Renombrar categoría"} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className={labelClass}>
          Nombre <span className="text-danger">*</span>
          <input
            name="name"
            required
            autoFocus
            maxLength={60}
            placeholder="Ej.: Buffets"
            defaultValue={category?.name}
            className={fieldClass}
          />
        </label>

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : isNew ? "Crear categoría" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
