"use client";

// Detalle del evento (HU10): datos copiados del contrato, servicios contratados, responsable y
// enlaces al contrato y la cotización. "Cancelar evento" anula también el contrato (HU11, R-EVT-4).
// Editar la planificación llega con el resto de HU11. Con `payments:record`, la tarjeta "Cuenta"
// del contrato del evento (HU19); con `finance:read`, el "Resultado económico" (HU22).
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { AccountCard } from "@/components/finance/account-card";
import { EventResultCard } from "@/components/finance/event-result-card";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { secondaryButton } from "@/components/ui/styles";
import { api, type Event } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatSchedule } from "@/lib/events";
import { formatSoles } from "@/lib/money";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/quotes";

import { EventStatusBadge } from "../event-status-badge";
import { CancelEventForm } from "./cancel-event-form";

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const justCreated = useSearchParams().get("nuevo") === "1";
  const { can } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(justCreated ? "Evento creado: quedó programado." : null);
  const [cancelling, setCancelling] = useState(false);
  const [moneyVersion, setMoneyVersion] = useState(0); // cambia al pagar o anular: refresca el resultado

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/events/{event_id}", {
      params: { path: { event_id: id } },
    });
    if (data) setEvent(data);
    else setError(errorMessage(apiError));
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Next guarda esta pantalla oculta al salir de ella: el aviso no debe reaparecer al volver.
  useEffect(() => () => setNotice(null), []);

  if (!event) {
    return error ? <ErrorAlert message={error} /> : <p className="py-10 text-center text-sm text-muted">Cargando…</p>;
  }

  // R-EVT-5: solo programado o confirmado; quien cancela también registra la devolución.
  const cancellable =
    (event.status === "SCHEDULED" || event.status === "CONFIRMED") &&
    can("events:manage") &&
    can("payments:record");

  const facts: [string, string][] = [
    ["Cliente", event.client_name],
    ["Tipo de evento", EVENT_TYPE_LABELS[event.event_type]],
    ["Fecha", formatDate(event.event_date)],
    ["Horario", formatSchedule(event)],
    ["Lugar", event.venue],
    ["Invitados", String(event.guests)],
  ];

  // Compras puede ver eventos, pero no contratos ni cotizaciones: ahí solo ve el código.
  const reference = (code: string, href: string, allowed: boolean) =>
    allowed ? (
      <Link href={href} className="text-primary hover:underline">
        {code}
      </Link>
    ) : (
      code
    );

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link href="/eventos" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Eventos
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{event.code}</h1>
              <EventStatusBadge status={event.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              Del contrato {reference(event.contract_code, `/contratos/${event.contract_id}`, can("contracts:manage"))} · cotización{" "}
              {reference(event.quote_code, `/cotizaciones/${event.quote_id}`, can("quotes:manage"))}
            </p>
          </div>
          {cancellable && (
            <button type="button" onClick={() => setCancelling(true)} className={`${secondaryButton} hover:text-danger`}>
              <Icon name="close" className="size-4" />
              Cancelar evento
            </button>
          )}
        </div>
        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Icon name="check" className="size-4 shrink-0" />
            {notice}
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-semibold">Datos del evento</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-0.5 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-3 font-semibold">Servicios contratados</h2>
            <ul className="divide-y divide-line">
              {event.services.map((service, index) => (
                <li key={index} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span>
                    {service.description}
                    {service.kind === "EXTRA" && <span className="ml-2 text-xs text-muted">adicional</span>}
                  </span>
                  <span className="tabular-nums text-muted">
                    {service.quantity} {service.unit === "PER_PERSON" ? "personas" : service.quantity === 1 ? "unidad" : "unidades"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Copiados del contrato al crear el evento.</p>
          </section>

          {can("payments:record") && (
            <AccountCard
              key={`${event.contract_id}-${event.status}`}
              contractId={event.contract_id}
              onChanged={() => {
                setMoneyVersion((n) => n + 1);
                void load();
              }}
            />
          )}
          {can("finance:read") && <EventResultCard key={`${event.status}-${moneyVersion}`} eventId={event.id} />}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-xl border border-line bg-surface p-5 text-sm">
            <h2 className="mb-2 font-semibold">Responsable de coordinación</h2>
            <p>{event.coordinator_name ?? "Usuario desactivado"}</p>
          </section>
          {event.cancellation && (
            <section className="rounded-xl border border-danger/30 bg-danger/5 p-5 text-sm">
              <h2 className="mb-2 font-semibold text-danger">Cancelado</h2>
              <p>{event.cancellation.reason}</p>
              {event.cancellation.refund_cents != null && (
                <p className="mt-1 text-muted">Devolución: {formatSoles(event.cancellation.refund_cents)}</p>
              )}
              {event.cancellation.note && <p className="mt-1 text-muted">{event.cancellation.note}</p>}
              <p className="mt-2 text-xs text-muted">El contrato {event.contract_code} quedó anulado.</p>
            </section>
          )}
        </aside>
      </div>

      {cancelling && (
        <CancelEventForm
          event={event}
          onClose={() => setCancelling(false)}
          onSaved={(updated) => {
            setEvent(updated);
            setCancelling(false);
            setNotice("Evento cancelado y contrato anulado.");
          }}
        />
      )}
    </div>
  );
}
