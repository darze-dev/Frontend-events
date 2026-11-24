"use client";

// Pantalla de clientes (HU04): buscar, registrar, editar contacto, desactivar y reactivar.
// Computadora y tablet: tabla. Celular: tarjetas. El formulario se abre en una ventana.
// El nombre abre el perfil del cliente con su historial (HU05).
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { fieldClass, primaryButton } from "@/components/ui/styles";
import { api, type Client } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

import { ClientForm } from "./client-form";

export function ClientsScreen() {
  const [text, setText] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<Client | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/clients", {
        params: { query: { text, include_inactive: includeInactive } },
      });
      setClients(data ?? []);
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

  async function changeStatus(client: Client) {
    const params = { path: { client_id: client.id } };
    const { error: apiError } = client.active
      ? await api.POST("/v1/clients/{client_id}/deactivate", { params })
      : await api.POST("/v1/clients/{client_id}/activate", { params });
    setDeactivating(null);
    if (apiError) setError(errorMessage(apiError));
    else await load();
  }

  // Desactivar pide confirmación; reactivar no, porque no hace daño.
  const onStatusClick = (client: Client) =>
    client.active ? setDeactivating(client) : void changeStatus(client);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="mt-1 text-sm text-muted">Personas y empresas que contratan los servicios de Darze.</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className={primaryButton}>
          <Icon name="plus" className="size-4" />
          Nuevo cliente
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 mt-[3px] size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Buscar por nombre, documento o teléfono"
            aria-label="Buscar clientes"
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

      {loading && clients.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando clientes…</p>
      ) : clients.length === 0 ? (
        <EmptyState searching={text.trim() !== ""} includeInactive={includeInactive} />
      ) : (
        <>
          {/* Computadora y tablet */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Correo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/clientes/${client.id}`} className="text-primary hover:underline">
                        {client.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {client.document_type} {client.document_number}
                    </td>
                    <td className="px-4 py-3 text-muted">{client.phone}</td>
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">{client.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge active={client.active} />
                    </td>
                    <td className="px-4 py-3">
                      <RowActions client={client} onEdit={setEditing} onStatus={onStatusClick} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular */}
          <ul className="space-y-3 md:hidden">
            {clients.map((client) => (
              <li key={client.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/clientes/${client.id}`} className="font-medium text-primary hover:underline">
                      {client.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {client.document_type} {client.document_number}
                    </p>
                  </div>
                  <StatusBadge active={client.active} />
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted">
                  <p className="flex items-center gap-2">
                    <Icon name="phone" className="size-4" />
                    {client.phone}
                  </p>
                  {client.email && (
                    <p className="flex items-center gap-2 break-all">
                      <Icon name="mail" className="size-4 shrink-0" />
                      {client.email}
                    </p>
                  )}
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <RowActions client={client} onEdit={setEditing} onStatus={onStatusClick} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing !== null && (
        <ClientForm
          client={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title="Desactivar cliente"
          message={`"${deactivating.name}" dejará de aparecer en las búsquedas. No se borra: sus cotizaciones y eventos se conservan, y puedes reactivarlo cuando quieras.`}
          confirmLabel="Desactivar"
          onConfirm={() => changeStatus(deactivating)}
          onClose={() => setDeactivating(null)}
        />
      )}
    </div>
  );
}

function RowActions({
  client,
  onEdit,
  onStatus,
}: {
  client: Client;
  onEdit: (client: Client) => void;
  onStatus: (client: Client) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(client)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-primary hover:bg-primary-soft"
      >
        <Icon name="pencil" className="size-4" />
        Editar
      </button>
      <button
        type="button"
        onClick={() => onStatus(client)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-muted ${
          client.active ? "text-muted hover:text-danger" : "text-success"
        }`}
      >
        <Icon name="power" className="size-4" />
        {client.active ? "Desactivar" : "Activar"}
      </button>
    </div>
  );
}

function EmptyState({ searching, includeInactive }: { searching: boolean; includeInactive: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
        <Icon name="users" />
      </span>
      <p className="font-medium">{searching ? "Ningún cliente coincide con la búsqueda" : "No hay clientes activos"}</p>
      <p className="mt-1 text-sm text-muted">
        {includeInactive
          ? "Prueba con otro nombre, documento o teléfono, o registra un cliente nuevo."
          : "Marca “Incluir desactivados” para ver también los clientes desactivados."}
      </p>
    </div>
  );
}
