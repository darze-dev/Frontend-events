"use client";

// Anular un pago o un movimiento (CA-19.5, CA-21.3): motivo obligatorio. No se borra nada:
// queda el registro con su anulación, quién y cuándo (RN17).
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { dangerButton, fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";

type Props = {
  title: string;
  summary: string;
  confirmLabel: string;
  // Devuelve el mensaje de error, o null si se anuló.
  onSubmit: (reason: string) => Promise<string | null>;
  onClose: () => void;
};

export function VoidForm({ title, summary, confirmLabel, onSubmit, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (!reason) return setError("Indica el motivo de la anulación.");
    setSaving(true);
    setError(null);
    const message = await onSubmit(reason);
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">{summary}</p>
        <label className={labelClass}>
          Motivo <span className="text-danger">*</span>
          <textarea name="reason" required rows={3} maxLength={500} autoFocus className={fieldClass} />
        </label>
        <p className="text-xs text-muted">
          Anular no borra el registro: queda con el motivo, la fecha y quién lo anuló, y deja de contar en los totales.
        </p>
        {error && <ErrorAlert message={error} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Volver
          </button>
          <button type="submit" disabled={saving} className={dangerButton}>
            {saving ? "Anulando…" : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
