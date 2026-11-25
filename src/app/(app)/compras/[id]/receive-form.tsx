"use client";

// Recibir una compra ordenada (CA-29.2–CA-29.4): por línea, la cantidad que realmente llegó
// (puede ser 0; no hay recepciones parciales, R-COM-2), lote y vencimiento; además factura o
// boleta y fecha. Recibir es una sola vez: pide confirmación y entonces sube el stock.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Purchase } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatQuantity, formatQuantityWithUnit, parseQuantity, toMilli } from "@/lib/inventory";
import { formatSoles } from "@/lib/money";
import { formatDate, todayInLima } from "@/lib/quotes";

type Props = { purchase: Purchase; onSaved: (purchase: Purchase) => void; onClose: () => void };
type LineInput = { quantity: string; lot: string; expiresOn: string };

export function ReceiveForm({ purchase, onSaved, onClose }: Props) {
  const today = todayInLima();
  const [lines, setLines] = useState<Record<string, LineInput>>(() =>
    Object.fromEntries(
      purchase.lines.map((line) => [
        line.product_id,
        { quantity: formatQuantity(line.quantity).replace(/,/g, ""), lot: "", expiresOn: "" },
      ]),
    ),
  );
  const [invoice, setInvoice] = useState("");
  const [receivedOn, setReceivedOn] = useState(today);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (productId: string, change: Partial<LineInput>) =>
    setLines((current) => ({ ...current, [productId]: { ...current[productId], ...change } }));

  const parsed = purchase.lines.map((line) => ({ line, quantity: parseQuantity(lines[line.product_id].quantity) }));
  const total = parsed.reduce(
    (sum, { line, quantity }) =>
      quantity === null ? sum : sum + Math.round(((line.unit_cost_cents ?? 0) * toMilli(quantity)) / 1000),
    0,
  );

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (parsed.some(({ quantity }) => quantity === null))
      return setError("Cada cantidad recibida es de cero o más, con hasta 3 decimales.");
    if (!receivedOn || receivedOn > today) return setError("La fecha de recepción no puede ser posterior a hoy.");
    setError(null);
    setConfirming(true);
  }

  async function receive() {
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/purchasing/purchases/{purchase_id}/receive", {
      params: { path: { purchase_id: purchase.id } },
      body: {
        invoice_number: invoice.trim() || null,
        received_on: receivedOn,
        lines: parsed.map(({ line, quantity }) => ({
          product_id: line.product_id,
          received_quantity: quantity ?? "0",
          lot: lines[line.product_id].lot.trim() || null,
          expires_on: lines[line.product_id].expiresOn || null,
        })),
      },
    });
    setSaving(false);
    if (data) onSaved(data);
    else {
      setError(errorMessage(apiError));
      setConfirming(false);
    }
  }

  if (confirming) {
    const differences = parsed.filter(({ line, quantity }) => quantity !== null && toMilli(quantity) !== toMilli(line.quantity));
    return (
      <Modal title="Confirmar recepción" onClose={onClose} size="sm">
        <div className="space-y-3 text-sm">
          <p>
            Se registrarán las entradas al almacén de {purchase.code} por <strong>{formatSoles(total)}</strong>, con fecha{" "}
            {formatDate(receivedOn)}.
          </p>
          {differences.length > 0 && (
            <p className="rounded-lg bg-warning/15 p-3 text-warning">
              {differences.length === 1 ? "1 producto llegó" : `${differences.length} productos llegaron`} en cantidad distinta a la
              pedida.
            </p>
          )}
          <p className="text-muted">La recepción es una sola vez: después la compra ya no cambia.</p>
        </div>
        {error && (
          <div className="mt-4">
            <ErrorAlert message={error} />
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
            Revisar
          </button>
          <button type="button" onClick={() => void receive()} disabled={saving} autoFocus className={primaryButton}>
            {saving ? "Recibiendo…" : "Confirmar recepción"}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Recibir ${purchase.code}`} onClose={onClose}>
      <form onSubmit={review} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Factura o boleta <span className="font-normal text-muted">(opcional)</span>
            <input value={invoice} onChange={(e) => setInvoice(e.target.value)} maxLength={50} autoFocus className={fieldClass} />
          </label>
          <label className={labelClass}>
            Fecha de recepción
            <input
              type="date"
              value={receivedOn}
              max={today}
              onChange={(e) => setReceivedOn(e.target.value)}
              required
              className={fieldClass}
            />
          </label>
        </div>

        {purchase.lines.map((line) => {
          const input = lines[line.product_id];
          const name = line.product_name ?? "Producto";
          return (
            <fieldset key={line.product_id} className="rounded-lg border border-line p-3">
              <legend className="px-1 text-sm font-medium">{name}</legend>
              <p className="mb-2 text-xs text-muted">
                Pedido: {formatQuantityWithUnit(line.quantity, line.unit)}
                {line.unit_cost_cents != null && ` · ${formatSoles(line.unit_cost_cents)} c/u`}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className={labelClass}>
                  Llegó
                  <input
                    value={input.quantity}
                    onChange={(e) => update(line.product_id, { quantity: e.target.value })}
                    inputMode="decimal"
                    required
                    aria-label={`Cantidad recibida de ${name}`}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Lote
                  <input
                    value={input.lot}
                    onChange={(e) => update(line.product_id, { lot: e.target.value })}
                    maxLength={50}
                    aria-label={`Lote de ${name} (opcional)`}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Vencimiento
                  <input
                    type="date"
                    value={input.expiresOn}
                    onChange={(e) => update(line.product_id, { expiresOn: e.target.value })}
                    aria-label={`Vencimiento de ${name} (opcional)`}
                    className={fieldClass}
                  />
                </label>
              </div>
            </fieldset>
          );
        })}

        <p className="flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-muted">Total recibido</span>
          <span className="font-semibold tabular-nums">{formatSoles(total)}</span>
        </p>

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Volver
          </button>
          <button type="submit" className={primaryButton}>
            Continuar
          </button>
        </div>
      </form>
    </Modal>
  );
}
