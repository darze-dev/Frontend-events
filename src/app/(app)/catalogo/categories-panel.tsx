"use client";

// Pestaña de categorías: crear, renombrar, desactivar y reactivar.
// Una categoría con servicios activos no se puede desactivar (regla acordada con Darze).
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { primaryButton } from "@/components/ui/styles";
import { api, type Category } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

import { CategoryForm } from "./category-form";
import { RowActions } from "./row-actions";

export function CategoriesPanel({ canManage }: { canManage: boolean }) {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/catalog/categories", {
        params: { query: { include_inactive: includeInactive } },
      });
      setCategories(data ?? []);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setError(errorMessage(null));
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function changeStatus(category: Category) {
    const params = { path: { category_id: category.id } };
    const { error: apiError } = category.active
      ? await api.POST("/v1/catalog/categories/{category_id}/deactivate", { params })
      : await api.POST("/v1/catalog/categories/{category_id}/activate", { params });
    setDeactivating(null);
    if (apiError) setError(errorMessage(apiError));
    else await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
            className="size-4 accent-primary"
          />
          Incluir desactivadas
        </label>
        {canManage && (
          <button type="button" onClick={() => setEditing("new")} className={`${primaryButton} sm:ml-auto`}>
            <Icon name="plus" className="size-4" />
            Nueva categoría
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      {loading && categories.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando categorías…</p>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-medium">No hay categorías para mostrar</p>
          <p className="mt-1 text-sm text-muted">
            {canManage
              ? "Crea la primera, por ejemplo “Buffets” o “Mobiliario”."
              : "El administrador todavía no ha creado categorías."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {categories.map((category) => (
            <li key={category.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <span className="font-medium">{category.name}</span>
                <StatusBadge active={category.active} />
              </div>
              {canManage && (
                <RowActions
                  active={category.active}
                  onEdit={() => setEditing(category)}
                  onStatus={() =>
                    category.active ? setDeactivating(category) : void changeStatus(category)
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <CategoryForm
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title="Desactivar categoría"
          message={`"${deactivating.name}" ya no se podrá usar para servicios nuevos. Solo se puede desactivar si no tiene servicios activos.`}
          confirmLabel="Desactivar"
          onConfirm={() => changeStatus(deactivating)}
          onClose={() => setDeactivating(null)}
        />
      )}
    </div>
  );
}
