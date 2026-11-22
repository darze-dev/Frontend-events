"use client";

// Pestaña de servicios: buscar por nombre o categoría, registrar, modificar y desactivar.
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { fieldClass, primaryButton } from "@/components/ui/styles";
import { api, type Category, type PriceUnit, type Service } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatSoles } from "@/lib/money";

import { RowActions } from "./row-actions";
import { ServiceForm } from "./service-form";

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  PER_PERSON: "Por persona",
  PER_UNIT: "Por unidad",
};

export function ServicesPanel({ canManage }: { canManage: boolean }) {
  const [text, setText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<Service | null>(null);

  // Todas las categorías (también las desactivadas) para mostrar el nombre de cada servicio.
  useEffect(() => {
    void api
      .GET("/v1/catalog/categories", { params: { query: { include_inactive: true } } })
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/catalog/services", {
        params: {
          query: { text, category_id: categoryId || null, include_inactive: includeInactive },
        },
      });
      setServices(data ?? []);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setError(errorMessage(null));
    } finally {
      setLoading(false);
    }
  }, [text, categoryId, includeInactive]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  async function changeStatus(service: Service) {
    const params = { path: { service_id: service.id } };
    const { error: apiError } = service.active
      ? await api.POST("/v1/catalog/services/{service_id}/deactivate", { params })
      : await api.POST("/v1/catalog/services/{service_id}/activate", { params });
    setDeactivating(null);
    if (apiError) setError(errorMessage(apiError));
    else await load();
  }

  const onStatus = (service: Service) =>
    service.active ? setDeactivating(service) : void changeStatus(service);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-64">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 mt-[3px] size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Buscar servicio"
            aria-label="Buscar servicios"
            className={`${fieldClass} pl-9`}
          />
        </div>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-label="Filtrar por categoría"
          className={`${fieldClass} lg:max-w-56`}
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.active ? "" : " (desactivada)"}
            </option>
          ))}
        </select>
        <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-muted">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
            className="size-4 accent-primary"
          />
          Incluir desactivados
        </label>
        {canManage && (
          <button type="button" onClick={() => setEditing("new")} className={`${primaryButton} shrink-0 whitespace-nowrap lg:ml-auto`}>
            <Icon name="plus" className="size-4" />
            Nuevo servicio
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      {loading && services.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando servicios…</p>
      ) : services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="catalog" />
          </span>
          <p className="font-medium">No hay servicios para mostrar</p>
          <p className="mt-1 text-sm text-muted">
            {includeInactive
              ? "Prueba con otro nombre o categoría."
              : "Prueba con otro nombre o categoría, o marca “Incluir desactivados”."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Servicio</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Cobro</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Precio ref.</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  {canManage && (
                    <th className="px-4 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{service.name}</p>
                      {service.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{service.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{categoryName(service.category_id)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {PRICE_UNIT_LABELS[service.price_unit]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                      {formatSoles(service.reference_price_cents)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={service.active} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <RowActions
                          active={service.active}
                          onEdit={() => setEditing(service)}
                          onStatus={() => onStatus(service)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {services.map((service) => (
              <li key={service.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted">{categoryName(service.category_id)}</p>
                  </div>
                  <StatusBadge active={service.active} />
                </div>
                <p className="mt-3 text-lg font-semibold tabular-nums">
                  {formatSoles(service.reference_price_cents)}
                  <span className="ml-1.5 text-sm font-normal text-muted">
                    {PRICE_UNIT_LABELS[service.price_unit].toLowerCase()}
                  </span>
                </p>
                {service.description && <p className="mt-1 text-sm text-muted">{service.description}</p>}
                {canManage && (
                  <div className="mt-4 border-t border-line pt-3">
                    <RowActions
                      active={service.active}
                      onEdit={() => setEditing(service)}
                      onStatus={() => onStatus(service)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {editing !== null && (
        <ServiceForm
          service={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title="Desactivar servicio"
          message={`"${deactivating.name}" ya no se podrá agregar a cotizaciones nuevas. Las cotizaciones ya hechas no cambian y puedes reactivarlo cuando quieras.`}
          confirmLabel="Desactivar"
          onConfirm={() => changeStatus(deactivating)}
          onClose={() => setDeactivating(null)}
        />
      )}
    </div>
  );
}
