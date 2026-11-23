"use client";

// Detalle del contrato (HU41–HU42): montos, firma, pagos y anulación.
// Pendiente de firma → "Registrar firma y adelanto" (un solo paso, R-CON-1).
// Pendiente o firmado → "Anular", con motivo y devolución opcional (R-CON-3).
// Firmado → "Convertir en evento" (HU10); si ya es evento, "Ver evento" y no se anula (R-EVT-3).
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Contract } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { PAYMENT_METHODS } from "@/lib/contracts";
import { formatSoles } from "@/lib/money";
import { formatDate } from "@/lib/quotes";

import { ContractStatusBadge } from "../contract-status-badge";
import { CancelForm } from "./cancel-form";
import { ConvertForm } from "./convert-form";
import { SignForm } from "./sign-form";

export function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const justCreated = useSearchParams().get("nuevo") === "1";
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(justCreated ? "Contrato generado: pendiente de firma." : null);
  const [dialog, setDialog] = useState<"sign" | "cancel" | "convert" | null>(null);
  const { can } = useAuth();

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/contracts/{contract_id}", {
      params: { path: { contract_id: id } },
    });
    if (data) setContract(data);
    else setError(errorMessage(apiError));
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Next guarda esta pantalla oculta al salir de ella: el aviso es de esa visita y no debe
  // reaparecer al volver (por ejemplo, "Firma registrada" después de convertir en evento).
  useEffect(() => () => setNotice(null), []);

  if (!contract) {
    return error ? <ErrorAlert message={error} /> : <p className="py-10 text-center text-sm text-muted">Cargando…</p>;
  }

  const saved = (updated: Contract, message: string) => {
    setContract(updated);
    setDialog(null);
    setNotice(message);
  };

  const facts: [string, string][] = [
    ["Cliente", contract.client_name],
    ["Fecha del evento", formatDate(contract.event_date)],
    ["Total", formatSoles(contract.total_cents)],
    ["Adelanto pactado", formatSoles(contract.advance_cents)],
    ["Saldo", formatSoles(contract.balance_cents)],
    ["Pagar el saldo hasta", formatDate(contract.balance_due_date)],
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link href="/contratos" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Contratos
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{contract.code}</h1>
              <ContractStatusBadge status={contract.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              De la cotización{" "}
              <Link href={`/cotizaciones/${contract.quote_id}`} className="text-primary hover:underline">
                {contract.quote_code}
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {contract.status === "PENDING_SIGNATURE" && (
              <button type="button" onClick={() => setDialog("sign")} className={primaryButton}>
                <Icon name="pen" className="size-4" />
                Registrar firma y adelanto
              </button>
            )}
            {contract.event_id && (
              <Link href={`/eventos/${contract.event_id}`} className={primaryButton}>
                <Icon name="calendar" className="size-4" />
                Ver evento
              </Link>
            )}
            {!contract.event_id && contract.can_become_event && can("events:manage") && (
              <button type="button" onClick={() => setDialog("convert")} className={primaryButton}>
                <Icon name="calendar" className="size-4" />
                Convertir en evento
              </button>
            )}
            {contract.status !== "CANCELLED" && !contract.event_id && (
              <button type="button" onClick={() => setDialog("cancel")} className={`${secondaryButton} hover:text-danger`}>
                <Icon name="close" className="size-4" />
                Anular
              </button>
            )}
          </div>
        </div>
        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Icon name="check" className="size-4 shrink-0" />
            {notice}
          </div>
        )}
        {!contract.event_id && contract.can_become_event && (
          <p className="rounded-lg bg-primary-soft p-3 text-sm text-primary">
            Firmado y con adelanto pagado: está listo para convertirse en evento.
          </p>
        )}
        {contract.event_id && (
          <p className="rounded-lg bg-surface-muted p-3 text-sm text-muted">
            Este contrato ya es un evento. Para anularlo, hay que cancelar el evento.
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-semibold">Condiciones económicas</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted">
              Los servicios y montos son los de la cotización aceptada y no se pueden modificar.
            </p>
          </section>

          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-3 font-semibold">Pagos</h2>
            {contract.payments.length === 0 ? (
              <p className="text-sm text-muted">Todavía no hay pagos. El adelanto se registra junto con la firma.</p>
            ) : (
              <ul className="divide-y divide-line">
                {contract.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>
                      <span className="block font-medium">
                        {payment.kind === "ADVANCE" ? "Adelanto" : "Devolución"}
                      </span>
                      <span className="block text-xs text-muted">
                        {formatDate(payment.paid_on)} · {PAYMENT_METHODS[payment.method]}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </span>
                    </span>
                    <span className={`font-medium tabular-nums ${payment.kind === "REFUND" ? "text-danger" : ""}`}>
                      {payment.kind === "REFUND" ? "− " : ""}
                      {formatSoles(payment.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {contract.signature && (
            <section className="rounded-xl border border-line bg-surface p-5 text-sm">
              <h2 className="mb-2 font-semibold">Firma</h2>
              <p>{contract.signature.signer_name}</p>
              <p className="text-muted">Firmado el {formatDate(contract.signature.signed_on)}</p>
            </section>
          )}
          {contract.cancellation && (
            <section className="rounded-xl border border-danger/30 bg-danger/5 p-5 text-sm">
              <h2 className="mb-2 font-semibold text-danger">Anulado</h2>
              <p>{contract.cancellation.reason}</p>
              {contract.cancellation.refund_cents != null && (
                <p className="mt-1 text-muted">Devolución: {formatSoles(contract.cancellation.refund_cents)}</p>
              )}
              {contract.cancellation.note && <p className="mt-1 text-muted">{contract.cancellation.note}</p>}
            </section>
          )}
        </aside>
      </div>

      {dialog === "sign" && (
        <SignForm contract={contract} onClose={() => setDialog(null)} onSaved={(c) => saved(c, "Firma y adelanto registrados.")} />
      )}
      {dialog === "convert" && <ConvertForm contract={contract} onClose={() => setDialog(null)} />}
      {dialog === "cancel" && (
        <CancelForm contract={contract} onClose={() => setDialog(null)} onSaved={(c) => saved(c, "Contrato anulado.")} />
      )}
    </div>
  );
}
