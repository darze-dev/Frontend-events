"use client";

// Proveedores (HU27): buscar por nombre o documento sin distinguir tildes (CA-27.2), registrar,
// editar, desactivar y reactivar (CA-27.3: no se elimina). Computadora y tablet: tabla.
// Celular: tarjetas. El formulario se abre en una ventana.
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { fieldClass, primaryButton } from "@/components/ui/styles";
import { api, type Supplier } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

import { SupplierForm } from "./supplier-form";

export function SuppliersScreen() {
  const [text, setText] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<Supplier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/purchasing/suppliers", {
        params: { query: { text, include_inactive: includeInactive } },
      });
      setSuppliers(data ?? []);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setError(errorMessage(null));
    } finally {
      setLoading(false);
    }
  }, [text, includeInactive]);

  // Busca 300 ms después de la última tecla, para no llamar a la API en cada letra.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function changeStatus(supplier: Supplier) {
    const params = { path: { supplier_id: supplier.id } };
    const { error: apiError } = supplier.active
      ? await api.POST("/v1/purchasing/suppliers/{supplier_id}/deactivate", { params })
      : await api.POST("/v1/purchasing/suppliers/{supplier_id}/activate", { params });
    setDeactivating(null);
    if (apiError) setError(errorMessage(apiError));
    else await load();
  }

  // Desactivar pide confirmación; reactivar no, porque no hace daño.
  const onStatusClick = (supplier: Supplier) =>
    supplier.active ? setDeactivating(supplier) : void changeStatus(supplier);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Proveedores</h1>
          <p className="mt-1 text-sm text-muted">Empresas y personas a las que Darze compra insumos y materiales.</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className={primaryButton}>
          <Icon name="plus" className="size-4" />
          Nuevo proveedor
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 mt-[3px] size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Buscar por razón social o documento"
            aria-label="Buscar proveedores"
            className={`${fieldClass} pl-9`}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
            className="size-4 accent-primary"
          />
          Incluir desactivados
        </label>
      </div>

      {error && <ErrorAlert message={error} />}

      {loading && suppliers.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando proveedores…</p>
      ) : suppliers.length === 0 ? (
        <EmptyState searching={text.trim() !== ""} includeInactive={includeInactive} />
      ) : (
        <>
          {/* Computadora y tablet */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Razón social</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Correo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3 font-medium">{supplier.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {supplier.document_type} {supplier.document_number}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {supplier.contact_name && <span className="block text-fg">{supplier.contact_name}</span>}
                      {supplier.phone}
                    </td>
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">{supplier.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge active={supplier.active} />
                    </td>
                    <td className="px-4 py-3">
                      <RowActions supplier={supplier} onEdit={setEditing} onStatus={onStatusClick} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular */}
          <ul className="space-y-3 md:hidden">
            {suppliers.map((supplier) => (
              <li key={supplier.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{supplier.name}</p>
                    <p className="text-sm text-muted">
                      {supplier.document_type} {supplier.document_number}
                    </p>
                  </div>
                  <StatusBadge active={supplier.active} />
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted">
                  <p className="flex items-center gap-2">
                    <Icon name="phone" className="size-4" />
                    {supplier.contact_name ? `${supplier.contact_name} · ` : ""}
                    {supplier.phone}
                  </p>
                  {supplier.email && (
                    <p className="flex items-center gap-2 break-all">
                      <Icon name="mail" className="size-4 shrink-0" />
                      {supplier.email}
                    </p>
                  )}
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <RowActions supplier={supplier} onEdit={setEditing} onStatus={onStatusClick} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing !== null && (
        <SupplierForm
          supplier={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title="Desactivar proveedor"
          message={`"${deactivating.name}" dejará de aparecer al ordenar compras. No se borra: sus compras se conservan y puedes reactivarlo cuando quieras.`}
          confirmLabel="Desactivar"
          onConfirm={() => changeStatus(deactivating)}
          onClose={() => setDeactivating(null)}
        />
      )}
    </div>
  );
}

function RowActions({
  supplier,
  onEdit,
  onStatus,
}: {
  supplier: Supplier;
  onEdit: (supplier: Supplier) => void;
  onStatus: (supplier: Supplier) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(supplier)}
        aria-label={`Editar ${supplier.name}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-primary hover:bg-primary-soft"
      >
        <Icon name="pencil" className="size-4" />
        Editar
      </button>
      <button
        type="button"
        onClick={() => onStatus(supplier)}
        aria-label={`${supplier.active ? "Desactivar" : "Activar"} ${supplier.name}`}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-muted ${
          supplier.active ? "text-muted hover:text-danger" : "text-success"
        }`}
      >
        <Icon name="power" className="size-4" />
        {supplier.active ? "Desactivar" : "Activar"}
      </button>
    </div>
  );
}

function EmptyState({ searching, includeInactive }: { searching: boolean; includeInactive: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
        <Icon name="truck" />
      </span>
      <p className="font-medium">{searching ? "Ningún proveedor coincide con la búsqueda" : "No hay proveedores activos"}</p>
      <p className="mt-1 text-sm text-muted">
        {includeInactive
          ? "Prueba con otra razón social o documento, o registra un proveedor nuevo."
          : "Marca “Incluir desactivados” para ver también los proveedores desactivados."}
      </p>
    </div>
  );
}
