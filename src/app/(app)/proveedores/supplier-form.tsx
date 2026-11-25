"use client";

// Registrar o editar un proveedor (CA-27.1): razón social, RUC (11 dígitos) o DNI (8, único),
// teléfono, y contacto, correo y dirección opcionales. Las reglas las valida el backend.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Supplier, type SupplierDocumentType } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { SUPPLIER_DOCUMENTS } from "@/lib/inventory";

type Props = {
  supplier: Supplier | null; // null = proveedor nuevo
  onSaved: (supplier: Supplier) => void;
  onClose: () => void;
};

export function SupplierForm({ supplier, onSaved, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = supplier === null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const body = {
      name: text("name"),
      document_type: text("document_type") as SupplierDocumentType,
      document_number: text("document_number"),
      phone: text("phone"),
      contact_name: text("contact_name") || null,
      email: text("email") || null,
      address: text("address") || null,
    };
    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = isNew
        ? await api.POST("/v1/purchasing/suppliers", { body })
        : await api.PUT("/v1/purchasing/suppliers/{supplier_id}", {
            params: { path: { supplier_id: supplier.id } },
            body,
          });
      if (data) onSaved(data);
      else setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? "Nuevo proveedor" : "Editar proveedor"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className={labelClass}>
          Razón social <span className="text-danger">*</span>
          <input name="name" required maxLength={150} autoFocus defaultValue={supplier?.name} className={fieldClass} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className={labelClass}>
            Documento <span className="text-danger">*</span>
            <select name="document_type" defaultValue={supplier?.document_type ?? "RUC"} className={fieldClass}>
              {(Object.keys(SUPPLIER_DOCUMENTS) as SupplierDocumentType[]).map((value) => (
                <option key={value} value={value}>
                  {SUPPLIER_DOCUMENTS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelClass} col-span-2`}>
            Número <span className="text-danger">*</span>
            <input
              name="document_number"
              required
              inputMode="numeric"
              defaultValue={supplier?.document_number}
              aria-describedby="document-hint"
              className={fieldClass}
            />
          </label>
        </div>
        <p id="document-hint" className="-mt-2 text-xs text-muted">
          RUC de 11 dígitos o DNI de 8.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Teléfono <span className="text-danger">*</span>
            <input name="phone" required inputMode="tel" defaultValue={supplier?.phone} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Contacto
            <input name="contact_name" maxLength={120} defaultValue={supplier?.contact_name ?? ""} className={fieldClass} />
          </label>
        </div>
        <label className={labelClass}>
          Correo
          <input name="email" type="email" defaultValue={supplier?.email ?? ""} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Dirección
          <input name="address" defaultValue={supplier?.address ?? ""} className={fieldClass} />
        </label>

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : isNew ? "Registrar proveedor" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
