"use client";

// "Registrar egreso" de una compra recibida: crea el egreso de insumos en Caja por el total.
import { useState } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type PaymentMethod, type Purchase } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { PAYMENT_METHODS } from "@/lib/contracts";
import { formatSoles } from "@/lib/money";

type Props = { purchase: Purchase; onClose: () => void; onSaved: (purchase: Purchase) => void };

export function ExpenseForm({ purchase, onClose, onSaved }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = await api.POST("/v1/purchasing/purchases/{purchase_id}/expense", {
        params: { path: { purchase_id: purchase.id } },
        body: { method, reference: reference.trim() || null },
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
    <Modal title={`Registrar egreso · ${purchase.code}`} size="sm" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          Se registra en Caja un egreso de insumos
          {purchase.total_cents != null ? ` por ${formatSoles(purchase.total_cents)}` : ""}.
        </p>
        {error && <ErrorAlert message={error} />}
        <label className="block text-sm font-medium">
          Medio de pago
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={fieldClass}>
            {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Referencia (opcional)
          <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} className={fieldClass} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancelar</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? "Registrando…" : "Registrar egreso"}</button>
        </div>
      </form>
    </Modal>
  );
}
