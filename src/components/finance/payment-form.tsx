"use client";

// Registrar un pago del contrato (HU19): monto mayor que cero y hasta el saldo (RN14), fecha
// no futura (R-PAG-4), medio y referencia opcional. El backend vuelve a validar todo.
import { useId, useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type AccountPayment, type ContractAccount, type PaymentMethod } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { PAYMENT_METHODS } from "@/lib/contracts";
import { centsToSolesText, formatSoles, solesToCents } from "@/lib/money";
import { todayInLima } from "@/lib/quotes";

type Props = {
  account: ContractAccount;
  onClose: () => void;
  onSaved: (account: ContractAccount, payment: AccountPayment) => void;
};

export function PaymentForm({ account, onClose, onSaved }: Props) {
  const today = todayInLima();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const amountHintId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const amount = solesToCents(text("amount"));
    if (amount === null || amount <= 0) return setError("Escribe el monto en soles, mayor que cero (ej.: 500.00).");
    if (amount > account.balance_cents) {
      return setError(`El pago supera el saldo pendiente de ${formatSoles(account.balance_cents)}.`);
    }
    const paidOn = text("paid_on");
    if (!paidOn || paidOn > today) return setError("La fecha del pago no puede ser posterior a hoy.");
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/contracts/{contract_id}/payments", {
      params: { path: { contract_id: account.contract_id } },
      body: {
        amount_cents: amount,
        paid_on: paidOn,
        method: text("method") as PaymentMethod,
        reference: text("reference") || null,
      },
    });
    setSaving(false);
    if (data) onSaved(data.account, data.payment);
    else setError(errorMessage(apiError));
  }

  return (
    <Modal title={`Registrar pago · ${account.contract_code}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-surface-muted p-3 text-sm">
          Saldo pendiente: <strong className="tabular-nums">{formatSoles(account.balance_cents)}</strong>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Monto (S/) <span className="text-danger">*</span>
            <input
              name="amount"
              inputMode="decimal"
              required
              autoFocus
              placeholder={centsToSolesText(account.balance_cents)}
              aria-describedby={amountHintId}
              className={fieldClass}
            />
            <span id={amountHintId} className="mt-1 block text-xs font-normal text-muted">
              Hasta {formatSoles(account.balance_cents)}
            </span>
          </label>
          <label className={labelClass}>
            Fecha del pago <span className="text-danger">*</span>
            <input name="paid_on" type="date" required max={today} defaultValue={today} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Medio <span className="text-danger">*</span>
            <select name="method" defaultValue="TRANSFER" className={fieldClass}>
              {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHODS[method]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Referencia
            <input name="reference" maxLength={100} placeholder="N.º de operación (opcional)" className={fieldClass} />
          </label>
        </div>
        {error && <ErrorAlert message={error} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Volver
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Registrando…" : "Registrar pago"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
