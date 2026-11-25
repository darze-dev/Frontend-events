"use client";

// Nuevo ingreso o egreso (HU21): fecha no futura (R-PAG-4), concepto, monto, categoría que
// corresponda al tipo, medio, referencia opcional y evento opcional (RN16). No se edita: si hay
// un error, se anula y se registra otro.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Movement, type MovementCategory, type MovementType, type PaymentMethod } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { PAYMENT_METHODS } from "@/lib/contracts";
import { MOVEMENT_CATEGORIES, categoriesOf } from "@/lib/finance";
import { solesToCents } from "@/lib/money";
import { todayInLima } from "@/lib/quotes";

import { EventPicker, type PickedEvent } from "./event-picker";

type Props = {
  type: MovementType;
  initialEvent: PickedEvent | null;
  onClose: () => void;
  onSaved: (movement: Movement) => void;
};

export function MovementForm({ type, initialEvent, onClose, onSaved }: Props) {
  const today = todayInLima();
  const categories = categoriesOf(type);
  const [linkedEvent, setLinkedEvent] = useState<PickedEvent | null>(initialEvent);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const amount = solesToCents(text("amount"));
    if (amount === null || amount <= 0) return setError("Escribe el monto en soles, mayor que cero (ej.: 150.00).");
    const occurredOn = text("occurred_on");
    if (!occurredOn || occurredOn > today) return setError("La fecha no puede ser posterior a hoy.");
    if (!text("concept")) return setError("Indica el concepto.");
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/movements", {
      body: {
        type,
        category: text("category") as MovementCategory,
        concept: text("concept"),
        amount_cents: amount,
        method: text("method") as PaymentMethod,
        occurred_on: occurredOn,
        reference: text("reference") || null,
        event_id: linkedEvent?.id ?? null,
      },
    });
    setSaving(false);
    if (data) onSaved(data);
    else setError(errorMessage(apiError));
  }

  return (
    <Modal title={type === "INCOME" ? "Nuevo ingreso" : "Nuevo egreso"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {type === "INCOME" && (
          <p className="text-sm text-muted">
            Para ingresos que no son pagos de un cliente (p. ej., alquiler de menaje). Los pagos de un contrato se
            registran en el contrato.
          </p>
        )}
        <label className={labelClass}>
          Concepto <span className="text-danger">*</span>
          <input name="concept" required maxLength={200} autoFocus className={fieldClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Monto (S/) <span className="text-danger">*</span>
            <input name="amount" inputMode="decimal" required placeholder="0.00" className={fieldClass} />
          </label>
          <label className={labelClass}>
            Fecha <span className="text-danger">*</span>
            <input name="occurred_on" type="date" required max={today} defaultValue={today} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Categoría <span className="text-danger">*</span>
            <select name="category" defaultValue={categories[0]} className={fieldClass}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {MOVEMENT_CATEGORIES[category].label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Medio <span className="text-danger">*</span>
            <select name="method" defaultValue="CASH" className={fieldClass}>
              {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHODS[method]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={labelClass}>
          Referencia
          <input name="reference" maxLength={100} placeholder="N.º de operación o comprobante (opcional)" className={fieldClass} />
        </label>
        <div className={labelClass}>
          <span>Evento</span>
          <EventPicker value={linkedEvent} onChange={setLinkedEvent} label="Evento asociado (opcional)" />
          <span className="mt-1 block text-xs font-normal text-muted">Opcional: asócialo si el gasto o ingreso es de un evento.</span>
        </div>
        {error && <ErrorAlert message={error} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Volver
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : type === "INCOME" ? "Registrar ingreso" : "Registrar egreso"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
