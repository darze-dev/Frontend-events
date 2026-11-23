"use client";

// Cancelar el evento (HU11, R-EVT-4): motivo obligatorio y, si se devolvió dinero, cuánto y cómo.
// En el mismo paso se anula el contrato. El sistema no calcula penalidades.
import { useEffect, useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { dangerButton, fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type Event, type PaymentMethod } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { PAYMENT_METHODS } from "@/lib/contracts";
import { formatSoles, solesToCents } from "@/lib/money";
import { todayInLima } from "@/lib/quotes";

type Props = { event: Event; onClose: () => void; onSaved: (event: Event) => void };

export function CancelEventForm({ event, onClose, onSaved }: Props) {
  const today = todayInLima();
  const [advanceCents, setAdvanceCents] = useState<number | null>(null);
  const [refund, setRefund] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .GET("/v1/contracts/{contract_id}", { params: { path: { contract_id: event.contract_id } } })
      .then(({ data }) => setAdvanceCents(data?.advance_cents ?? null));
  }, [event.contract_id]);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    let refundCents: number | null = null;
    if (refund) {
      refundCents = solesToCents(text("refund_amount"));
      if (refundCents === null) return setError("Escribe el monto devuelto en soles (ej.: 1000.00).");
    }
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/events/{event_id}/cancel", {
      params: { path: { event_id: event.id } },
      body: {
        reason: text("reason"),
        note: text("note") || null,
        refund_cents: refundCents,
        refund: refund
          ? { paid_on: text("refund_on"), method: text("refund_method") as PaymentMethod, reference: text("refund_reference") || null }
          : null,
      },
    });
    setSaving(false);
    if (data) onSaved(data);
    else setError(errorMessage(apiError));
  }

  return (
    <Modal title={`Cancelar ${event.code}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
          También se anula el contrato {event.contract_code}. Si el cliente quiere otra fecha, hay que hacer
          una cotización nueva.
        </p>
        <label className={labelClass}>
          Motivo <span className="text-danger">*</span>
          <textarea name="reason" required rows={3} maxLength={500} autoFocus className={fieldClass} />
        </label>

        <div className="space-y-3 rounded-lg border border-line p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="size-4 accent-primary" />
            Se devolvió dinero al cliente
            {advanceCents !== null && ` (adelanto pagado: ${formatSoles(advanceCents)})`}
          </label>
          {refund && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Monto devuelto (S/) <span className="text-danger">*</span>
                <input name="refund_amount" inputMode="decimal" required className={fieldClass} />
              </label>
              <label className={labelClass}>
                Medio
                <select name="refund_method" defaultValue="TRANSFER" className={fieldClass}>
                  {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((method) => (
                    <option key={method} value={method}>
                      {PAYMENT_METHODS[method]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Fecha de la devolución
                <input name="refund_on" type="date" max={today} defaultValue={today} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Referencia
                <input name="refund_reference" maxLength={100} className={fieldClass} />
              </label>
            </div>
          )}
        </div>

        <label className={labelClass}>
          Nota
          <input name="note" maxLength={500} placeholder="Opcional" className={fieldClass} />
        </label>
        <p className="text-xs text-muted">
          Cancelar no borra el evento ni el contrato: queda el registro con el motivo, la fecha y quién lo canceló.
        </p>
        {error && <ErrorAlert message={error} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Volver
          </button>
          <button type="submit" disabled={saving} className={dangerButton}>
            {saving ? "Cancelando…" : "Cancelar evento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
