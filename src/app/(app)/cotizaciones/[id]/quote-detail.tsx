"use client";

// Detalle de una cotización (HU08): ver, cambiar de estado y, si está en borrador, modificarla.
// Aceptada, rechazada o vencida: solo lectura (CA-08.4).
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Quote, type QuoteStatus } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatSoles } from "@/lib/money";
import { EVENT_TYPE_LABELS, NEXT_STATUSES, STATUS_STYLES, formatDate, formatTime } from "@/lib/quotes";

import { QuoteEditor } from "../quote-editor";
import { QuoteStatusBadge } from "../quote-status-badge";
import { ContractAction } from "./contract-action";
import { DownloadPdfButton } from "./download-pdf-button";

type Target = Exclude<QuoteStatus, "EXPIRED">;

const ACTIONS: Record<Target, { label: string; icon: IconName; primary?: boolean; confirm?: string }> = {
  SENT: { label: "Marcar como enviada", icon: "send", primary: true },
  ACCEPTED: {
    label: "Aceptada",
    icon: "check",
    confirm: "El cliente aceptó la cotización. Después ya no se podrá modificar ni cambiar de estado.",
  },
  REJECTED: {
    label: "Rechazada",
    icon: "close",
    confirm: "El cliente rechazó la cotización. Es definitivo: para otra propuesta se crea una nueva.",
  },
  DRAFT: { label: "Volver a borrador", icon: "undo" },
};

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const justCreated = useSearchParams().get("nueva") === "1";
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(justCreated ? "Cotización guardada como borrador." : null);
  const [confirming, setConfirming] = useState<Target | null>(null);

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/quotes/{quote_id}", {
      params: { path: { quote_id: id } },
    });
    if (data) setQuote(data);
    else setError(errorMessage(apiError));
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Next guarda esta pantalla oculta al salir de ella: el aviso no debe reaparecer al volver.
  useEffect(() => () => setNotice(null), []);

  async function changeStatus(status: Target) {
    setConfirming(null);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/quotes/{quote_id}/status", {
      params: { path: { quote_id: id } },
      body: { status },
    });
    if (data) {
      setQuote(data);
      setNotice(`Estado actualizado: ${STATUS_STYLES[data.status].label}.`);
    } else {
      setError(errorMessage(apiError));
    }
  }

  if (!quote) {
    return error ? <ErrorAlert message={error} /> : <p className="py-10 text-center text-sm text-muted">Cargando…</p>;
  }

  const next = (NEXT_STATUSES[quote.status] ?? []) as Target[];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link href="/cotizaciones" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Cotizaciones
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{quote.code}</h1>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {quote.client_name} · {EVENT_TYPE_LABELS[quote.event_type]} · vigente hasta {formatDate(quote.valid_until)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DownloadPdfButton quote={quote} onError={setError} />
            <ContractAction quote={quote} />
            {next.map((status) => {
              const action = ACTIONS[status];
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => (action.confirm ? setConfirming(status) : void changeStatus(status))}
                  className={action.primary ? primaryButton : secondaryButton}
                >
                  <Icon name={action.icon} className="size-4" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Icon name="check" className="size-4 shrink-0" />
            {notice}
          </div>
        )}
        {error && <ErrorAlert message={error} />}
        {quote.status === "DRAFT" && (
          <p className="text-sm text-muted">
            Cuando esté lista, márcala como enviada: así se habilita “Descargar PDF” para entregarla al cliente.
          </p>
        )}
        {quote.status === "SENT" && (
          <p className="rounded-lg bg-primary-soft p-3 text-sm text-primary">
            Fue enviada al cliente. Para modificarla, usa “Volver a borrador”.
          </p>
        )}
        {quote.status === "EXPIRED" && (
          <p className="rounded-lg bg-warning/15 p-3 text-sm text-warning">
            Venció el {formatDate(quote.valid_until)} sin ser aceptada. No se reabre: si el cliente sigue interesado, crea
            una cotización nueva.
          </p>
        )}
      </header>

      {quote.status === "DRAFT" ? (
        <QuoteEditor
          key={quote.id + quote.lines.length + quote.total_cents}
          quote={quote}
          onSaved={(saved) => {
            setQuote(saved);
            setNotice("Cambios guardados.");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : (
        <QuoteView quote={quote} />
      )}

      {confirming && (
        <ConfirmDialog
          title={`Marcar como ${ACTIONS[confirming].label.toLowerCase()}`}
          message={ACTIONS[confirming].confirm ?? ""}
          confirmLabel={ACTIONS[confirming].label}
          onConfirm={() => changeStatus(confirming)}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

// Vista de solo lectura para las cotizaciones que ya no son borrador.
function QuoteView({ quote }: { quote: Quote }) {
  const facts: [string, string][] = [
    ["Cliente", quote.client_name],
    ["Tipo de evento", EVENT_TYPE_LABELS[quote.event_type]],
    ["Fecha", formatDate(quote.event_date)],
    [
      "Horario",
      `${formatTime(quote.start_time)} a ${formatTime(quote.end_time)}${quote.ends_next_day ? " (del día siguiente)" : ""}`,
    ],
    ["Lugar", quote.venue],
    ["Invitados", String(quote.guests)],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-4 font-semibold">Evento</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-0.5 text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="overflow-hidden rounded-xl border border-line bg-surface">
          <h2 className="px-5 pt-5 font-semibold">Servicios y conceptos</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2.5 font-medium">Descripción</th>
                <th className="px-3 py-2.5 text-right font-medium">Cant.</th>
                <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Precio</th>
                <th className="px-5 py-2.5 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quote.lines.map((line, index) => (
                <tr key={index}>
                  <td className="px-5 py-3">
                    {line.description}
                    <span className="block text-xs text-muted">
                      {line.kind === "EXTRA" ? "Concepto adicional" : line.unit === "PER_PERSON" ? "Por persona" : "Por unidad"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{line.quantity}</td>
                  <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{formatSoles(line.unit_price_cents)}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">{formatSoles(line.subtotal_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {quote.notes && (
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-2 font-semibold">Notas</h2>
            <p className="whitespace-pre-line text-sm text-muted">{quote.notes}</p>
          </section>
        )}
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm text-muted">Total</p>
          <p className="text-3xl font-semibold tabular-nums">{formatSoles(quote.total_cents)}</p>
          <p className="mt-1 text-xs text-muted">Precios finales en soles, sin IGV aparte.</p>
        </div>
      </aside>
    </div>
  );
}
