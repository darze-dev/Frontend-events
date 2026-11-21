"use client";

// Formulario para registrar un cliente o editar sus datos de contacto (HU04).
// Las reglas (DNI de 8 dígitos, teléfono válido…) las valida el backend; aquí solo se muestran.
import { useState, type FormEvent } from "react";

import { api, type Client } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = {
  client: Client | null; // null = cliente nuevo
  onSaved: () => void;
  onCancel: () => void;
};

const input =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900";

export function ClientForm({ client, onSaved, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = client === null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const contact = {
      name: text("name"),
      phone: text("phone"),
      email: text("email") || null,
      address: text("address") || null,
    };

    setSaving(true);
    setError(null);
    try {
      const { error: apiError } = isNew
        ? await api.POST("/v1/clients", {
            body: {
              ...contact,
              document_type: text("document_type") === "RUC" ? "RUC" : "DNI",
              document_number: text("document_number"),
            },
          })
        : await api.PUT("/v1/clients/{client_id}", {
            params: { path: { client_id: client.id } },
            body: contact,
          });
      if (apiError) {
        setError(errorMessage(apiError));
      } else {
        onSaved();
      }
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 className="text-lg font-semibold">{isNew ? "Nuevo cliente" : "Editar cliente"}</h2>

      <label className="block space-y-1 text-sm">
        <span>Nombre o razón social *</span>
        <input name="name" required defaultValue={client?.name} className={input} />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block space-y-1 text-sm">
          <span>Documento *</span>
          <select
            name="document_type"
            defaultValue={client?.document_type ?? "DNI"}
            disabled={!isNew}
            className={input}
          >
            <option value="DNI">DNI</option>
            <option value="RUC">RUC</option>
          </select>
        </label>
        <label className="col-span-2 block space-y-1 text-sm">
          <span>Número *</span>
          <input
            name="document_number"
            required={isNew}
            inputMode="numeric"
            defaultValue={client?.document_number}
            disabled={!isNew}
            className={input}
          />
        </label>
      </div>
      {!isNew && (
        <p className="text-xs text-zinc-500">
          El documento solo se corrige con un motivo (próximamente, con el inicio de sesión).
        </p>
      )}

      <label className="block space-y-1 text-sm">
        <span>Teléfono *</span>
        <input name="phone" required inputMode="tel" defaultValue={client?.phone} className={input} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Correo</span>
        <input name="email" type="email" defaultValue={client?.email ?? ""} className={input} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Dirección</span>
        <input name="address" defaultValue={client?.address ?? ""} className={input} />
      </label>

      {error && (
        <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
