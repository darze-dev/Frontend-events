"use client";

// Detalle del evento (HU10): datos copiados del contrato, servicios contratados, responsable y
// enlaces al contrato y la cotización. "Cancelar evento" anula también el contrato (HU11, R-EVT-4).
// HU11: stepper de estados con el siguiente paso, "Editar planificación" (programado o confirmado)
// y la pestaña "Historial" de cambios. La pestaña "Seguimiento" tiene actividades
// y bitácora de observaciones (HU13). En "Resumen", con `payments:record`, la tarjeta "Cuenta"
// del contrato del evento (HU19); con `finance:read`, el "Resultado económico" (HU22).
// Con `inventory:read`, la pestaña "Materiales": salió, volvió, merma y falta devolver (HU26).
// HU14: botón "Ficha" a la ficha consolidada; `?pestana=` abre una pestaña (enlaces de la ficha).
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";

import { useAuth } from "@/components/auth-provider";
import { AccountCard } from "@/components/finance/account-card";
import { EventResultCard } from "@/components/finance/event-result-card";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Event } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatSchedule } from "@/lib/events";
import { formatSoles } from "@/lib/money";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/quotes";

import { EventStatusBadge } from "../event-status-badge";
import { CancelEventForm } from "./cancel-event-form";
import { EventFollowUp } from "./event-follow-up";
import { EventHistory } from "./event-history";
import { EventMaterials } from "./event-materials";
import { EventStepper } from "./event-stepper";
import { PlanningForm } from "./planning-form";

const ALL_TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "seguimiento", label: "Seguimiento" },
  { id: "materiales", label: "Materiales" }, // con `inventory:read` (CA-26.6)
  { id: "historial", label: "Historial" }, // CA-11.5
] as const;
type Tab = (typeof ALL_TABS)[number]["id"];

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("nuevo") === "1";
  const { can } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(justCreated ? "Evento creado: quedó programado." : null);
  const [warning, setWarning] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [planning, setPlanning] = useState(false);
  const tabs = ALL_TABS.filter((t) => t.id !== "materiales" || can("inventory:read"));
  const requested = tabs.find((t) => t.id === searchParams.get("pestana"))?.id;
  const [tab, setTab] = useState<Tab>(requested ?? "resumen");
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
  useEffect(
    () => () => {
      setNotice(null);
      setWarning(null);
    },
    [],
  );

  // Pestañas accesibles: flechas izquierda/derecha mueven la selección y el foco.
  function onTabKey(keyEvent: KeyboardEvent<HTMLButtonElement>) {
    if (keyEvent.key !== "ArrowRight" && keyEvent.key !== "ArrowLeft") return;
    const index = tabs.findIndex((t) => t.id === tab);
    const next = tabs[(index + (keyEvent.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].id;
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  if (!event) {
    return error ? <ErrorAlert message={error} /> : <p className="py-10 text-center text-sm text-muted">Cargando…</p>;
  }

  // R-EVT-5: solo programado o confirmado; quien cancela también registra la devolución.
  const cancellable =
    (event.status === "SCHEDULED" || event.status === "CONFIRMED") &&
    can("events:manage") &&
    can("payments:record");
  // R-EVT-6: la planificación se edita en programado o confirmado.
  const editable = (event.status === "SCHEDULED" || event.status === "CONFIRMED") && can("events:manage");

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
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/eventos/${event.id}/ficha`} className={secondaryButton}>
              <Icon name="file" className="size-4" />
              Ficha
            </Link>
            {editable && (
              <button type="button" onClick={() => setPlanning(true)} className={primaryButton}>
                <Icon name="pencil" className="size-4" />
                Editar planificación
              </button>
            )}
            {cancellable && (
              <button type="button" onClick={() => setCancelling(true)} className={`${secondaryButton} hover:text-danger`}>
                <Icon name="close" className="size-4" />
                Cancelar evento
              </button>
            )}
          </div>
        </div>
        <EventStepper
          event={event}
          onChanged={(updated, message) => {
            setEvent(updated);
            setWarning(null);
            setNotice(message);
          }}
        />
        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Icon name="check" className="size-4 shrink-0" />
            {notice}
          </div>
        )}
        {warning && (
          <div role="alert" className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
            <Icon name="alert" className="size-4 shrink-0" />
            {warning}
          </div>
        )}
      </header>

      <div role="tablist" aria-label="Secciones del evento" className="flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={onTabKey}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "materiales" && (
        <div role="tabpanel" id="panel-materiales" aria-labelledby="tab-materiales">
          <EventMaterials event={event} />
        </div>
      )}

      {tab === "historial" && (
        <div role="tabpanel" id="panel-historial" aria-labelledby="tab-historial">
          <EventHistory event={event} />
        </div>
      )}

      {tab === "seguimiento" && (
        <div role="tabpanel" id="panel-seguimiento" aria-labelledby="tab-seguimiento">
          <EventFollowUp event={event} />
        </div>
      )}

      <div
        role="tabpanel"
        id="panel-resumen"
        aria-labelledby="tab-resumen"
        hidden={tab !== "resumen"}
        className="grid gap-6 lg:grid-cols-[1fr_20rem]"
      >
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

      {planning && (
        <PlanningForm
          event={event}
          onClose={() => setPlanning(false)}
          onSaved={({ warnings, ...updated }) => {
            setEvent(updated);
            setPlanning(false);
            setNotice("Planificación actualizada.");
            setWarning(
              warnings.includes("staff_may_need_review")
                ? "Revisa el personal asignado: cambió la fecha u horario."
                : null,
            );
          }}
        />
      )}

      {cancelling && (
        <CancelEventForm
          event={event}
          onClose={() => setCancelling(false)}
          onSaved={(updated) => {
            setEvent(updated);
            setCancelling(false);
            setWarning(null);
            setNotice("Evento cancelado y contrato anulado.");
          }}
        />
      )}
    </div>
  );
}
