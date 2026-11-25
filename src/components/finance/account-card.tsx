"use client";

// Tarjeta "Cuenta" del contrato (HU19–HU20), en el contrato y en su evento (R-PAG-1): total,
// pagado, saldo, fecha límite y aviso de saldo vencido (R-PAG-2), y la lista de pagos con su
// comprobante. Solo se muestra con `payments:record` (quien la usa decide si renderizarla).
// En un contrato anulado no hay saldo ni pagos nuevos (CA-19.6).
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { primaryButton } from "@/components/ui/styles";
import { api, type AccountPayment, type ContractAccount } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { PAYMENT_METHODS } from "@/lib/contracts";
import { PAYMENT_KINDS, formatDateTime } from "@/lib/finance";
import { formatSoles } from "@/lib/money";
import { formatDate } from "@/lib/quotes";

import { PaymentForm } from "./payment-form";
import { ReceiptButton } from "./receipt-button";
import { VoidForm } from "./void-form";

type Props = {
  contractId: string;
  // Se llama después de registrar o anular un pago, para refrescar la pantalla que la contiene.
  onChanged?: () => void;
};

export function AccountCard({ contractId, onChanged }: Props) {
  const [account, setAccount] = useState<ContractAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState<AccountPayment | null>(null);

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/contracts/{contract_id}/account", {
      params: { path: { contract_id: contractId } },
    });
    if (data) setAccount(data);
    else setError(errorMessage(apiError));
  }, [contractId]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (!account) {
    return (
      <section aria-labelledby="account-title" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="account-title" className="mb-3 font-semibold">
          Cuenta
        </h2>
        {error ? <ErrorAlert message={error} /> : <p className="text-sm text-muted">Cargando…</p>}
      </section>
    );
  }

  const cancelled = account.status === "CANCELLED";
  const canPay = account.status === "SIGNED" && account.balance_cents > 0;
  const facts: [string, string][] = [
    ["Total", formatSoles(account.total_cents)],
    ["Pagado", formatSoles(account.paid_cents)],
  ];
  if (account.refunded_cents > 0) facts.push(["Devuelto", formatSoles(account.refunded_cents)]);
  if (!cancelled) {
    facts.push(["Saldo", formatSoles(account.balance_cents)]);
    facts.push(["Pagar el saldo hasta", formatDate(account.balance_due_date)]);
  }

  async function voidPayment(payment: AccountPayment, reason: string): Promise<string | null> {
    const { data, error: apiError } = await api.POST("/v1/payments/{payment_id}/void", {
      params: { path: { payment_id: payment.id } },
      body: { reason },
    });
    if (!data) return errorMessage(apiError);
    setAccount(data);
    setVoiding(null);
    setNotice(`Pago ${payment.number} anulado.`);
    onChanged?.();
    return null;
  }

  return (
    <section aria-labelledby="account-title" className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="account-title" className="font-semibold">
          Cuenta
        </h2>
        {canPay && (
          <button type="button" onClick={() => setPaying(true)} className={primaryButton}>
            <Icon name="plus" className="size-4" />
            Registrar pago
          </button>
        )}
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className={`mt-0.5 text-sm tabular-nums ${label === "Saldo" ? "font-semibold" : ""}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {!cancelled && account.overdue && account.balance_cents > 0 && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-warning/15 p-3 text-sm text-warning">
          <Icon name="alert" className="size-4 shrink-0" />
          Saldo vencido: la fecha límite fue el {formatDate(account.balance_due_date)}. Aún se puede registrar el pago.
        </p>
      )}
      {cancelled && (
        <p className="mt-4 rounded-lg bg-surface-muted p-3 text-sm text-muted">
          Contrato anulado: no tiene saldo por cobrar ni admite pagos nuevos.
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
          <Icon name="check" className="size-4 shrink-0" />
          {notice}
        </p>
      )}
      {error && (
        <div className="mt-4">
          <ErrorAlert message={error} />
        </div>
      )}

      <h3 className="mb-2 mt-5 text-sm font-semibold">Pagos</h3>
      {account.payments.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay pagos. El adelanto se registra junto con la firma.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-y border-line bg-surface-muted/50 text-xs text-muted">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">Número</th>
                <th scope="col" className="px-2 py-2 font-medium">Fecha</th>
                <th scope="col" className="px-2 py-2 font-medium">Medio</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Monto</th>
                <th scope="col" className="px-2 py-2 font-medium">Registró</th>
                <th scope="col" className="px-5 py-2 text-right font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {account.payments.map((payment) => (
                <tr key={payment.id} className={payment.voided ? "text-muted" : ""}>
                  <td className="px-5 py-2.5 align-top">
                    <span className="block font-medium tabular-nums">{payment.number}</span>
                    <span className="block text-xs text-muted">{PAYMENT_KINDS[payment.kind]}</span>
                    {payment.void && (
                      <span className="mt-1 block text-xs text-danger">
                        Anulado: {payment.void.reason}
                        <span className="block text-muted">
                          {payment.void.voided_by_name} · {formatDateTime(payment.void.voided_at)}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 align-top">{formatDate(payment.paid_on)}</td>
                  <td className="px-2 py-2.5 align-top">
                    {PAYMENT_METHODS[payment.method]}
                    {payment.reference && <span className="block text-xs text-muted">{payment.reference}</span>}
                  </td>
                  <td
                    className={`px-2 py-2.5 text-right align-top font-medium tabular-nums ${
                      payment.voided ? "line-through" : payment.kind === "REFUND" ? "text-danger" : ""
                    }`}
                  >
                    {payment.kind === "REFUND" ? "− " : ""}
                    {formatSoles(payment.amount_cents)}
                  </td>
                  <td className="px-2 py-2.5 align-top">
                    {payment.recorded_by_name}
                    <span className="block text-xs text-muted">{formatDateTime(payment.recorded_at)}</span>
                  </td>
                  <td className="px-5 py-2.5 text-right align-top">
                    <div className="flex justify-end gap-1">
                      <ReceiptButton payment={payment} onError={setError} />
                      {payment.voidable && !payment.voided && (
                        <button
                          type="button"
                          onClick={() => setVoiding(payment)}
                          aria-label={`Anular pago ${payment.number}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          <Icon name="close" className="size-4" />
                          Anular
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paying && (
        <PaymentForm
          account={account}
          onClose={() => setPaying(false)}
          onSaved={(updated, payment) => {
            setAccount(updated);
            setPaying(false);
            setNotice(`Pago ${payment.number} registrado por ${formatSoles(payment.amount_cents)}.`);
            onChanged?.();
          }}
        />
      )}
      {voiding && (
        <VoidForm
          title={`Anular pago ${voiding.number}`}
          summary={`${PAYMENT_KINDS[voiding.kind]} de ${formatSoles(voiding.amount_cents)} del ${formatDate(voiding.paid_on)}. El saldo del contrato vuelve a subir.`}
          confirmLabel="Anular pago"
          onSubmit={(reason) => voidPayment(voiding, reason)}
          onClose={() => setVoiding(null)}
        />
      )}
    </section>
  );
}
