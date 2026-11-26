"use client";

// Formulario para registrar un cliente o editar sus datos de contacto (HU04), en una ventana.
// Las reglas (DNI de 8 dígitos, teléfono válido…) las valida el backend; aquí solo se muestran.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Client } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = {
  client: Client | null; // null = cliente nuevo
  onSaved: (saved: Client | null) => void;
  onClose: () => void;
  // Texto ya escrito en otra pantalla (p. ej. el buscador de la cotización): si son solo dígitos
  // se propone como número de documento; si no, como nombre.
  initialText?: string;
};

export function ClientForm({ client, onSaved, onClose, initialText = "" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = client === null;
  const typed = initialText.trim();
  const typedIsDocument = /^\d+$/.test(typed);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // El formulario puede abrirse dentro de otro (la cotización): que su envío no llegue a ese.
    event.stopPropagation();
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
      const { data, error: apiError } = isNew
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
      if (apiError) setError(errorMessage(apiError));
      else onSaved((data as Client | undefined) ?? null);
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? "Nuevo cliente" : "Editar cliente"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className={labelClass}>
          Nombre o razón social <span className="text-danger">*</span>
          <input name="name" required autoFocus defaultValue={client?.name ?? (typedIsDocument ? "" : typed)} className={fieldClass} />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className={labelClass}>
            Documento <span className="text-danger">*</span>
            <select
              name="document_type"
              defaultValue={client?.document_type ?? "DNI"}
              disabled={!isNew}
              className={fieldClass}
            >
              <option value="DNI">DNI</option>
              <option value="RUC">RUC</option>
            </select>
          </label>
          <label className={`${labelClass} col-span-2`}>
            Número <span className="text-danger">*</span>
            <input
              name="document_number"
              required={isNew}
              inputMode="numeric"
              defaultValue={client?.document_number ?? (typedIsDocument ? typed : "")}
              disabled={!isNew}
              className={fieldClass}
            />
          </label>
        </div>
        {!isNew && (
          <p className="-mt-2 text-xs text-muted">
            El documento no se cambia aquí: se corrige con un motivo que queda registrado (RN03).
          </p>
        )}

        <label className={labelClass}>
          Teléfono <span className="text-danger">*</span>
          <input name="phone" required inputMode="tel" defaultValue={client?.phone} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Correo
          <input name="email" type="email" defaultValue={client?.email ?? ""} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Dirección
          <input name="address" defaultValue={client?.address ?? ""} className={fieldClass} />
        </label>

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : isNew ? "Registrar cliente" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
