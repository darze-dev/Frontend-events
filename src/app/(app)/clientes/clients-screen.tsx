"use client";

// Pantalla de clientes (HU04): buscar, registrar, editar contacto y desactivar.
// Todo se lee y se guarda en la API real (/v1/clients).
import { useCallback, useEffect, useState } from "react";

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

  async function toggleActive(client: Client) {
    const params = { path: { client_id: client.id } };
    const { error: apiError } = client.active
      ? await api.POST("/v1/clients/{client_id}/deactivate", { params })
      : await api.POST("/v1/clients/{client_id}/activate", { params });
    if (apiError) {
      setError(errorMessage(apiError));
    } else {
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-zinc-500">Busca por nombre, documento o teléfono.</p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
        >
          + Nuevo cliente
        </button>
      </header>

      {editing !== null && (
        <ClientForm
          key={editing === "new" ? "new" : editing.id}
          client={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ej.: jose ramirez, 44125896, 987654321"
          aria-label="Buscar clientes"
          className="w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
          />
          Mostrar desactivados
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-3 font-medium">{client.name}</td>
                <td className="px-4 py-3">
                  {client.document_type} {client.document_number}
                </td>
                <td className="px-4 py-3">{client.phone}</td>
                <td className="px-4 py-3">{client.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      client.active
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : "rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }
                  >
                    {client.active ? "Activo" : "Desactivado"}
                  </span>
                </td>
                <td className="space-x-3 whitespace-nowrap px-4 py-3 text-right">
                  <button onClick={() => setEditing(client)} className="text-amber-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => toggleActive(client)} className="text-zinc-500 hover:underline">
                    {client.active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No hay clientes que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
