"use client";

// En una cotización aceptada: "Generar contrato" (HU41) o, si ya existe, "Ver contrato".
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Quote } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { defaultAdvance } from "@/lib/contracts";
import { centsToSolesText, formatSoles, solesToCents } from "@/lib/money";
import { addDays, formatDate } from "@/lib/quotes";

export function ContractAction({ quote }: { quote: Quote }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [advance, setAdvance] = useState(centsToSolesText(defaultAdvance(quote.total_cents)));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (quote.status !== "ACCEPTED") return null;
  if (quote.contract_id) {
    return (
      <Link href={`/contratos/${quote.contract_id}`} className={primaryButton}>
        <Icon name="contract" className="size-4" />
        Ver contrato
      </Link>
    );
  }

  const advanceCents = solesToCents(advance);
  const balance = advanceCents === null ? null : quote.total_cents - advanceCents;

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (advanceCents === null) return setError("Escribe el adelanto en soles, con hasta 2 decimales.");
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/contracts", {
      body: { quote_id: quote.id, advance_cents: advanceCents },
    });
    setSaving(false);
    if (data) router.push(`/contratos/${data.id}?nuevo=1`);
    else setError(errorMessage(apiError));
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        <Icon name="contract" className="size-4" />
        Generar contrato
      </button>
      {open && (
        <Modal title="Generar contrato" onClose={() => setOpen(false)} size="sm">
          <form onSubmit={generate} className="space-y-4">
            <p className="text-sm text-muted">
              El contrato copia los datos de {quote.code} y queda <strong>pendiente de firma</strong>.
            </p>
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-surface-muted p-3 text-sm">
              <dt className="text-muted">Total</dt>
              <dd className="text-right font-medium tabular-nums">{formatSoles(quote.total_cents)}</dd>
              <dt className="text-muted">Saldo</dt>
              <dd className="text-right tabular-nums">{balance === null ? "—" : formatSoles(balance)}</dd>
              <dt className="text-muted">Pagar el saldo hasta</dt>
              <dd className="text-right">{formatDate(addDays(quote.event_date, -7))}</dd>
            </dl>
            <label className={labelClass}>
              Adelanto pactado (S/)
              <input
                inputMode="decimal"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                className={fieldClass}
              />
              <span className="mt-1 block text-xs font-normal text-muted">Sugerido: 50 % del total. Puedes ajustarlo.</span>
            </label>
            {error && <ErrorAlert message={error} />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} className={primaryButton}>
                {saving ? "Generando…" : "Generar contrato"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
