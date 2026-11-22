"use client";

// Firma y adelanto en un solo paso (HU42, R-CON-1). El monto del adelanto es el pactado.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Contract, type PaymentMethod } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { PAYMENT_METHODS } from "@/lib/contracts";
import { formatSoles } from "@/lib/money";
import { todayInLima } from "@/lib/quotes";

type Props = { contract: Contract; onClose: () => void; onSaved: (contract: Contract) => void };

export function SignForm({ contract, onClose, onSaved }: Props) {
  const today = todayInLima();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/contracts/{contract_id}/sign", {
      params: { path: { contract_id: contract.id } },
      body: {
        signed_on: text("signed_on"),
        signer_name: text("signer_name"),
        advance: {
          paid_on: text("paid_on"),
          method: text("method") as PaymentMethod,
          reference: text("reference") || null,
        },
      },
    });
    setSaving(false);
    if (data) onSaved(data);
    else setError(errorMessage(apiError));
  }

  return (
    <Modal title="Registrar firma y adelanto" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Firma</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Firmado por <span className="text-danger">*</span>
              <input name="signer_name" required autoFocus defaultValue={contract.client_name} className={fieldClass} />
            </label>
            <label className={labelClass}>
              Fecha de firma <span className="text-danger">*</span>
              <input name="signed_on" type="date" required max={today} defaultValue={today} className={fieldClass} />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">
            Adelanto: <span className="tabular-nums">{formatSoles(contract.advance_cents)}</span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Medio de pago <span className="text-danger">*</span>
              <select name="method" defaultValue="TRANSFER" className={fieldClass}>
                {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHODS[method]}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Fecha del pago <span className="text-danger">*</span>
              <input name="paid_on" type="date" required max={today} defaultValue={today} className={fieldClass} />
            </label>
          </div>
          <label className={labelClass}>
            Referencia
            <input name="reference" maxLength={100} placeholder="N.º de operación o voucher" className={fieldClass} />
          </label>
        </fieldset>

        <p className="text-xs text-muted">
          El adelanto queda registrado como el primer pago del evento y no se puede borrar. Después de firmar, el contrato
          ya no se modifica.
        </p>
        {error && <ErrorAlert message={error} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Registrando…" : "Registrar firma y adelanto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
