"use client";

// Formulario de la cotización (HU07) y su edición en borrador (HU08, CA-08.1).
// El total se calcula en pantalla mientras se escribe (CA-07.5), pero el que vale es el que
// devuelve el backend al guardar: allí se recalcula siempre.
import { useState, type FormEvent, type ReactNode } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type EventType, type Quote, type QuoteIn, type Service } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { centsToSolesText, formatSoles, solesToCents } from "@/lib/money";
import { EVENT_TYPE_LABELS, addDays, formatDate, todayInLima } from "@/lib/quotes";

import { ClientPicker, type PickedClient } from "./client-picker";
import { ServicePicker } from "./service-picker";

type Line = {
  key: string;
  kind: "SERVICE" | "EXTRA";
  serviceId?: string;
  description: string;
  unit: "PER_PERSON" | "PER_UNIT";
  quantity: string;
  price: string; // soles, como lo escribe el usuario
  catalogPriceCents?: number | null;
  followsGuests: boolean; // por persona: la cantidad sigue a los invitados hasta que se edite a mano
};

type Props = {
  quote?: Quote; // sin cotización: es una nueva
  onSaved: (quote: Quote) => void;
  onCancel?: () => void;
};

let counter = 0;
const newKey = () => `l${++counter}`;

function linesFrom(quote: Quote): Line[] {
  return quote.lines.map((line) => ({
    key: newKey(),
    kind: line.kind,
    serviceId: line.service_id ?? undefined,
    description: line.description,
    unit: line.unit,
    quantity: String(line.quantity),
    price: centsToSolesText(line.unit_price_cents),
    catalogPriceCents: line.catalog_price_cents,
    followsGuests: line.unit === "PER_PERSON" && line.quantity === quote.guests,
  }));
}

function subtotal(line: Line): number | null {
  const quantity = Number(line.quantity);
  const cents = solesToCents(line.price);
  if (!Number.isInteger(quantity) || quantity < 1 || cents === null) return null;
  return quantity * cents;
}

export function QuoteEditor({ quote, onSaved, onCancel }: Props) {
  const today = todayInLima();
  const [client, setClient] = useState<PickedClient | null>(
    quote ? { id: quote.client_id, name: quote.client_name } : null,
  );
  const [eventType, setEventType] = useState<EventType>(quote?.event_type ?? "WEDDING");
  const [eventDate, setEventDate] = useState(quote?.event_date ?? "");
  const [startTime, setStartTime] = useState(quote?.start_time.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(quote?.end_time.slice(0, 5) ?? "");
  const [venue, setVenue] = useState(quote?.venue ?? "");
  const [guests, setGuests] = useState(quote ? String(quote.guests) : "");
  const [validUntil, setValidUntil] = useState(quote?.valid_until ?? "");
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() => (quote ? linesFrom(quote) : []));
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const guestCount = Number(guests);
  const subtotals = lines.map(subtotal);
  const total = subtotals.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const endsNextDay = Boolean(startTime && endTime && endTime < startTime);

  const changeGuests = (value: string) => {
    setGuests(value);
    const count = Number(value);
    if (Number.isInteger(count) && count > 0) {
      setLines((current) =>
        current.map((line) => (line.followsGuests ? { ...line, quantity: String(count) } : line)),
      );
    }
  };

  const update = (key: string, changes: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...changes } : line)));

  const addService = (service: Service) => {
    setError(null);
    const perPerson = service.price_unit === "PER_PERSON";
    const count = Number.isInteger(guestCount) && guestCount > 0 ? guestCount : 1;
    setLines((current) => [
      ...current,
      {
        key: newKey(),
        kind: "SERVICE",
        serviceId: service.id,
        description: service.name,
        unit: service.price_unit,
        quantity: String(perPerson ? count : 1),
        price: centsToSolesText(service.reference_price_cents),
        catalogPriceCents: service.reference_price_cents,
        followsGuests: perPerson,
      },
    ]);
  };

  const addExtra = () => {
    setError(null);
    setLines((current) => [
      ...current,
      { key: newKey(), kind: "EXTRA", description: "", unit: "PER_UNIT", quantity: "1", price: "", followsGuests: false },
    ]);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return setError("Elige un cliente.");
    if (lines.length === 0) return setError("Agrega al menos un servicio o concepto a la cotización.");
    const bad = lines.findIndex((line, index) => subtotals[index] === null);
    if (bad >= 0) {
      return setError(
        `Revisa la línea ${bad + 1}: la cantidad debe ser un entero mayor que cero y el precio un monto en soles (ej.: 45.50).`,
      );
    }
    const body: QuoteIn = {
      client_id: client.id,
      event_type: eventType,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      venue,
      guests: guestCount,
      valid_until: validUntil || null,
      notes: notes.trim() || null,
      lines: lines.map((line) =>
        line.kind === "SERVICE"
          ? {
              kind: "SERVICE",
              service_id: line.serviceId,
              quantity: Number(line.quantity),
              unit_price_cents: solesToCents(line.price),
            }
          : {
              kind: "EXTRA",
              description: line.description,
              quantity: Number(line.quantity),
              unit_price_cents: solesToCents(line.price),
            },
      ),
    };

    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = quote
        ? await api.PUT("/v1/quotes/{quote_id}", { params: { path: { quote_id: quote.id } }, body })
        : await api.POST("/v1/quotes", { body });
      if (data) onSaved(data);
      else setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_20rem]" noValidate>
      <div className="min-w-0 space-y-6">
        <Section title="Cliente">
          <label className={labelClass}>
            Cliente <span className="text-danger">*</span>
            <ClientPicker
              value={client}
              onChange={(picked) => {
                setClient(picked);
                setError(null);
              }}
            />
          </label>
        </Section>

        <Section title="Evento">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Tipo de evento <span className="text-danger">*</span>
              <select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)} className={fieldClass}>
                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
                  <option key={type} value={type}>
                    {EVENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Fecha <span className="text-danger">*</span>
              <input type="date" required min={today} value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={fieldClass} />
            </label>
            <label className={labelClass}>
              Hora de inicio <span className="text-danger">*</span>
              <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className={fieldClass} />
            </label>
            <label className={labelClass}>
              Hora de fin <span className="text-danger">*</span>
              <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className={fieldClass} />
              {endsNextDay && (
                <span className="mt-1 block text-xs font-normal text-primary">Termina al día siguiente.</span>
              )}
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Lugar <span className="text-danger">*</span>
              <input
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Dirección o local donde se atiende"
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Invitados <span className="text-danger">*</span>
              <input
                type="number"
                required
                min={1}
                inputMode="numeric"
                value={guests}
                onChange={(e) => changeGuests(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Vigencia hasta
              <input type="date" min={today} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={fieldClass} />
              {!validUntil && !quote && (
                <span className="mt-1 block text-xs font-normal text-muted">
                  Si la dejas vacía: {formatDate(addDays(today, 15))} (15 días).
                </span>
              )}
            </label>
          </div>
        </Section>

        <Section
          title="Servicios y conceptos"
          actions={
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPicking(true)} className={secondaryButton}>
                <Icon name="catalog" className="size-4" />
                Agregar servicio
              </button>
              <button type="button" onClick={addExtra} className={secondaryButton}>
                <Icon name="plus" className="size-4" />
                Concepto adicional
              </button>
            </div>
          }
        >
          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
              Agrega servicios del catálogo (menús, bebidas, mobiliario…) o conceptos adicionales (movilidad, recargos…).
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map((line, index) => (
                <li key={line.key} className="rounded-lg border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    {line.kind === "SERVICE" ? (
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{line.description}</p>
                        <p className="text-xs text-muted">
                          {line.unit === "PER_PERSON" ? "Por persona" : "Por unidad"}
                          {line.catalogPriceCents != null && ` · catálogo ${formatSoles(line.catalogPriceCents)}`}
                        </p>
                      </div>
                    ) : (
                      <input
                        value={line.description}
                        onChange={(e) => update(line.key, { description: e.target.value })}
                        placeholder="Descripción (ej.: Movilidad a Chosica)"
                        aria-label={`Descripción de la línea ${index + 1}`}
                        className={`${fieldClass} mt-0`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                      aria-label={`Quitar la línea ${index + 1}`}
                      className="shrink-0 rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-danger"
                    >
                      <Icon name="trash" className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 items-end gap-3">
                    <label className="block text-xs text-muted">
                      Cantidad
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(e) => update(line.key, { quantity: e.target.value, followsGuests: false })}
                        className={fieldClass}
                      />
                    </label>
                    <label className="block text-xs text-muted">
                      Precio (S/)
                      <input
                        inputMode="decimal"
                        value={line.price}
                        onChange={(e) => update(line.key, { price: e.target.value })}
                        placeholder="0.00"
                        className={fieldClass}
                      />
                    </label>
                    <div className="pb-2.5 text-right">
                      <p className="text-xs text-muted">Subtotal</p>
                      <p className="font-medium tabular-nums">
                        {subtotals[index] === null ? "—" : formatSoles(subtotals[index] ?? 0)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Notas">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Detalles para el cliente o para el equipo (opcional)"
            aria-label="Notas"
            className={`${fieldClass} mt-0`}
          />
        </Section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-4 rounded-xl border border-line bg-surface p-5">
          <div>
            <p className="text-sm text-muted">Total</p>
            <p className="text-3xl font-semibold tabular-nums">{formatSoles(total)}</p>
            <p className="mt-1 text-xs text-muted">Precios finales en soles, sin IGV aparte.</p>
          </div>
          <p className="text-sm text-muted">
            {lines.length} {lines.length === 1 ? "línea" : "líneas"}
          </p>
          {error && <ErrorAlert message={error} />}
          <div className="flex flex-col gap-2">
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? "Guardando…" : quote ? "Guardar cambios" : "Guardar borrador"}
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel} className={secondaryButton}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </aside>

      {picking && <ServicePicker onPick={addService} onClose={() => setPicking(false)} />}
    </form>
  );
}

function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
