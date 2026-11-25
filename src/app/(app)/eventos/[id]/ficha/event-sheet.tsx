"use client";

// Ficha consolidada del evento (HU14): una sola hoja de solo lectura con todo lo necesario antes
// de ejecutar el evento. Sale de una sola petición (CA-14.7) y cada tarjeta enlaza a su pantalla
// para editar (R-FIC-1). "Finanzas" llega vacía sin `payments:record` (CA-14.5) y "Equipo", vacía
// mientras el módulo de personal no la exponga (CA-14.3). Se imprime con el navegador (CA-14.8).
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { primaryButton } from "@/components/ui/styles";
import { api, type EventSheet as Sheet, type SheetActivity } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { CONTRACT_STATUS, PAYMENT_METHODS } from "@/lib/contracts";
import { formatDateTimeLima, formatSchedule, formatShiftLima } from "@/lib/events";
import { PAYMENT_KINDS } from "@/lib/finance";
import { PRODUCT_KINDS, formatQuantityWithUnit, toMilli } from "@/lib/inventory";
import { formatSoles } from "@/lib/money";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/quotes";

import { EventStatusBadge } from "../../event-status-badge";

const LAST_NOTES = 5;

export function EventSheet() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/reports/events/{event_id}/sheet", {
      params: { path: { event_id: id } },
    });
    if (data) setSheet(data);
    else setError(errorMessage(apiError));
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const eventHref = `/eventos/${id}`;
  const back = (
    <Link href={eventHref} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg print:hidden">
      <Icon name="chevronLeft" className="size-4" />
      Volver al evento
    </Link>
  );

  if (!sheet) {
    return (
      <div className="space-y-4">
        {back}
        {error ? <ErrorAlert message={error} /> : <p className="py-10 text-center text-sm text-muted">Cargando ficha…</p>}
      </div>
    );
  }

  const { event, client, services, staff, materials, account, follow_up: followUp } = sheet;
  const unitLabel = (unit: "PER_PERSON" | "PER_UNIT", quantity: number) =>
    unit === "PER_PERSON" ? "personas" : quantity === 1 ? "unidad" : "unidades";

  return (
    <div className="space-y-6 print:space-y-4">
      <header className="space-y-4">
        {back}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted">Ficha del evento</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{event.code}</h1>
              <EventStatusBadge status={event.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {client.name} · {formatDate(event.event_date)} · {formatSchedule(event)}
            </p>
          </div>
          <button type="button" onClick={() => window.print()} className={`${primaryButton} print:hidden`}>
            <Icon name="download" className="size-4" />
            Imprimir
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 print:block print:space-y-4">
        <SheetCard title="Resumen" href={eventHref} linkLabel="Ver evento">
          <h3 className="mb-2 text-sm font-semibold">Evento</h3>
          <Facts
            items={[
              ["Código", event.code],
              ["Tipo de evento", EVENT_TYPE_LABELS[event.event_type]],
              ["Fecha", formatDate(event.event_date)],
              ["Horario", formatSchedule(event)],
              ["Lugar", event.venue],
              ["Invitados", String(event.guests)],
              ["Responsable", event.coordinator_name ?? "Usuario desactivado"],
            ]}
          />
          <h3 className="mb-2 mt-5 text-sm font-semibold">
            Cliente
            {can("clients:manage") && (
              <Link href={`/clientes/${client.id}`} className="ml-2 font-normal text-primary hover:underline print:hidden">
                Ver cliente
              </Link>
            )}
          </h3>
          <Facts
            items={[
              ["Nombre", client.name],
              ["Documento", `${client.document_type} ${client.document_number}`],
              ["Teléfono", client.phone],
              ...(client.email ? ([["Correo", client.email]] as [string, string][]) : []),
            ]}
          />
        </SheetCard>

        <SheetCard
          title="Servicios contratados"
          href={can("contracts:manage") ? `/contratos/${event.contract_id}` : undefined}
          linkLabel="Ver contrato"
        >
          {services.length === 0 ? (
            <Empty>Sin servicios contratados.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {services.map((service, index) => (
                <li key={`${service.service_id ?? "extra"}-${index}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span>
                    {service.description}
                    {service.kind === "EXTRA" && <span className="ml-2 text-xs text-muted">adicional</span>}
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-muted">
                    {service.quantity} {unitLabel(service.unit, service.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SheetCard>

        <SheetCard title="Equipo">
          {staff === null ? (
            <Empty>Sin información de personal todavía.</Empty>
          ) : staff.length === 0 ? (
            <Empty>Todavía no hay personal asignado.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {staff.map((member) => (
                <li key={`${member.worker_id}-${member.starts_at}`} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2.5 text-sm">
                  <span>
                    <span className="font-medium">{member.name}</span>
                    <span className="block text-xs text-muted">{member.role}</span>
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-muted">
                    {formatShiftLima(member.starts_at, member.ends_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SheetCard>

        <SheetCard
          title="Materiales"
          href={can("inventory:read") ? `${eventHref}?pestana=materiales` : undefined}
          linkLabel="Ver materiales"
        >
          {materials.length === 0 ? (
            <Empty>Todavía no salieron materiales para este evento.</Empty>
          ) : (
            <div className="-mx-5 overflow-x-auto print:mx-0 print:overflow-visible">
              <table className="w-full min-w-[32rem] text-left text-sm print:min-w-0">
                <thead className="border-y border-line bg-surface-muted/50 text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2 font-medium">Producto</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Salió</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Volvió</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Merma</th>
                    <th scope="col" className="px-5 py-2 text-right font-medium">Falta devolver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {materials.map((material) => {
                    const qty = (value: string) => formatQuantityWithUnit(value, material.unit);
                    const pending = toMilli(material.pending_return) > 0;
                    return (
                      <tr key={material.product_id}>
                        <td className="px-5 py-2.5 align-top">
                          <span className="font-medium">{material.name}</span>
                          <span className="block text-xs text-muted">
                            {material.code} · {PRODUCT_KINDS[material.kind].label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right align-top tabular-nums">{qty(material.out)}</td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right align-top tabular-nums">{qty(material.returned)}</td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right align-top tabular-nums">{qty(material.wasted)}</td>
                        <td
                          className={`whitespace-nowrap px-5 py-2.5 text-right align-top font-medium tabular-nums ${
                            pending ? "text-warning" : "text-muted"
                          }`}
                        >
                          {material.kind === "REUSABLE" ? qty(material.pending_return) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SheetCard>

        {account && (
          <SheetCard title="Finanzas" href={eventHref} linkLabel="Ver cuenta">
            <p className="-mt-2 mb-3 text-xs text-muted">
              Contrato {account.contract_code} · {CONTRACT_STATUS[account.contract_status].label}
            </p>
            <Facts
              items={[
                ["Total", formatSoles(account.total_cents)],
                ["Pagado", formatSoles(account.paid_cents)],
                ...(account.refunded_cents > 0
                  ? ([["Devuelto", formatSoles(account.refunded_cents)]] as [string, string][])
                  : []),
                ["Saldo", formatSoles(account.balance_cents)],
                ["Fecha límite", formatDate(account.balance_due_date)],
              ]}
            />
            {account.overdue && account.balance_cents > 0 && (
              <p className="mt-3 flex items-center gap-2 rounded-lg bg-warning/15 p-3 text-sm text-warning">
                <Icon name="alert" className="size-4 shrink-0" />
                Saldo vencido desde el {formatDate(account.balance_due_date)}.
              </p>
            )}
            <h3 className="mb-2 mt-5 text-sm font-semibold">Pagos</h3>
            {account.payments.length === 0 ? (
              <Empty>Todavía no hay pagos.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {account.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className={`flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm ${payment.voided ? "text-muted" : ""}`}
                  >
                    <span>
                      <span className="font-medium tabular-nums">{payment.number}</span>
                      <span className="block text-xs text-muted">
                        {PAYMENT_KINDS[payment.kind]} · {PAYMENT_METHODS[payment.method]} · {formatDate(payment.paid_on)}
                        {payment.voided && " · anulado"}
                      </span>
                    </span>
                    <span
                      className={`whitespace-nowrap font-medium tabular-nums ${
                        payment.voided ? "line-through" : payment.kind === "REFUND" ? "text-danger" : ""
                      }`}
                    >
                      {payment.kind === "REFUND" ? "− " : ""}
                      {formatSoles(payment.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SheetCard>
        )}

        <SheetCard title="Seguimiento" href={`${eventHref}?pestana=seguimiento`} linkLabel="Ver seguimiento">
          <ActivityList title="Actividades pendientes" items={followUp.pending} empty="Sin actividades pendientes." />
          <ActivityList title="Actividades completadas" items={followUp.done} empty="Sin actividades completadas." />
          <h3 className="mb-2 mt-5 text-sm font-semibold">Últimas observaciones</h3>
          {followUp.recent_notes.length === 0 ? (
            <Empty>Sin observaciones.</Empty>
          ) : (
            <ul className="space-y-3">
              {followUp.recent_notes.slice(0, LAST_NOTES).map((note) => (
                <li key={note.id} className="text-sm">
                  <p className="whitespace-pre-line">{note.text}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {note.created_by_name || "Usuario desactivado"} · {formatDateTimeLima(note.created_at)}
                    {note.edited_at && " · editada"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SheetCard>
      </div>
    </div>
  );
}

// Tarjeta de la ficha: título (h2), enlace a la pantalla para editar y contenido. No se corta al imprimir.
function SheetCard({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="break-inside-avoid rounded-xl border border-line bg-surface p-5 print:rounded-none print:border-slate-300"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={titleId} className="font-semibold">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline print:hidden"
          >
            {linkLabel}
            <span className="sr-only"> ({title.toLowerCase()})</span>
            <Icon name="chevronRight" className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ActivityList({ title, items, empty }: { title: string; items: SheetActivity[]; empty: string }) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-semibold">
        {title} <span className="font-normal text-muted">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <ul className="space-y-1.5">
          {items.map((activity) => (
            <li key={activity.id} className="flex gap-2 text-sm">
              <Icon
                name={activity.status === "DONE" ? "check" : "calendar"}
                className={`mt-0.5 size-4 shrink-0 ${activity.status === "DONE" ? "text-success" : "text-muted"}`}
              />
              <span>
                <span className={activity.status === "DONE" ? "text-muted line-through" : ""}>{activity.description}</span>
                <span className="block text-xs text-muted">
                  {activity.responsible_name || "Usuario desactivado"}
                  {activity.completed_at && ` · completada el ${formatDateTimeLima(activity.completed_at)}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
