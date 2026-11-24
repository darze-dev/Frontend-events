"use client";

// Calendario de eventos (HU12): mes, semana o día, con filtros por estado, tipo y cliente.
// La vista y la fecha quedan en la dirección (?vista=mes&fecha=2026-12-01): al volver desde el
// detalle de un evento, el calendario sigue donde estaba.
// Un evento que cruza la medianoche se muestra solo el día en que empieza (R-CAL-1).
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type EventStatus, type EventSummary, type EventType } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import {
  type CalendarView,
  VIEWS,
  WEEKDAYS,
  dayLabel,
  dayNumber,
  daysBetween,
  isIsoDate,
  isView,
  periodTitle,
  shift,
  visibleRange,
} from "@/lib/calendar";
import { EVENT_STATUS } from "@/lib/events";
import { EVENT_TYPE_LABELS, todayInLima } from "@/lib/quotes";

import { EventChip } from "./event-chip";
import { EventSummaryModal } from "./event-summary-modal";

const MONTH_CELL_LIMIT = 3; // eventos por día en la vista de mes; el resto, "+N más"

export function CalendarScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const today = todayInLima();
  const view: CalendarView = isView(params.get("vista")) ? (params.get("vista") as CalendarView) : "mes";
  const day = isIsoDate(params.get("fecha")) ? (params.get("fecha") as string) : today;

  const [status, setStatus] = useState<EventStatus | "">("");
  const [type, setType] = useState<EventType | "">("");
  const [client, setClient] = useState("");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EventSummary | null>(null);

  const range = useMemo(() => visibleRange(view, day), [view, day]);

  const go = useCallback(
    (nextView: CalendarView, nextDay: string) => {
      router.replace(`/eventos/calendario?vista=${nextView}&fecha=${nextDay}`, { scroll: false });
    },
    [router],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await api.GET("/v1/events/calendar", {
      params: {
        query: {
          date_from: range.from,
          date_to: range.to,
          text: client,
          status: status || null,
          event_type: type || null,
        },
      },
    });
    setEvents(data ?? []);
    setError(apiError ? errorMessage(apiError) : null);
    setLoading(false);
  }, [range, client, status, type]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  // Next guarda esta pantalla oculta al ir al detalle: al volver, el recuadro no debe reabrirse.
  useEffect(() => () => setSelected(null), []);

  const byDay = useMemo(() => {
    const map = new Map<string, EventSummary[]>();
    for (const event of events) map.set(event.event_date, [...(map.get(event.event_date) ?? []), event]);
    return map;
  }, [events]);

  const days = daysBetween(range.from, range.to);
  const month = day.slice(0, 7);
  const daysWithEvents = days.filter((d) => byDay.has(d) && (view !== "mes" || d.startsWith(month)));
  const filtered = Boolean(status || type || client);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendario de eventos</h1>
          <p className="mt-1 text-sm text-muted">La programación de Darze por mes, semana o día.</p>
        </div>
        <Link href="/eventos" className={secondaryButton}>
          Ver lista
        </Link>
      </header>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3">
        <label className={labelClass}>
          Cliente
          <input
            type="search"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Nombre o código"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value as EventStatus | "")} className={fieldClass}>
            <option value="">Todos</option>
            {(Object.keys(EVENT_STATUS) as EventStatus[]).map((value) => (
              <option key={value} value={value}>
                {EVENT_STATUS[value].label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Tipo de evento
          <select value={type} onChange={(e) => setType(e.target.value as EventType | "")} className={fieldClass}>
            <option value="">Todos</option>
            {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((value) => (
              <option key={value} value={value}>
                {EVENT_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(view, shift(view, day, -1))} aria-label="Periodo anterior" className={secondaryButton}>
            <Icon name="chevronLeft" className="size-4" />
          </button>
          <button type="button" onClick={() => go(view, today)} className={secondaryButton}>
            Hoy
          </button>
          <button type="button" onClick={() => go(view, shift(view, day, 1))} aria-label="Periodo siguiente" className={secondaryButton}>
            <Icon name="chevronRight" className="size-4" />
          </button>
          <h2 className="ml-2 text-lg font-semibold" aria-live="polite">
            {periodTitle(view, day)}
          </h2>
        </div>
        <div role="group" aria-label="Vista" className="inline-flex self-start rounded-lg border border-line bg-surface p-1">
          {VIEWS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => go(option.value, day)}
              aria-pressed={view === option.value}
              className={`rounded-md px-3 py-1.5 text-sm ${
                view === option.value ? "bg-primary text-white" : "text-muted hover:text-fg"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorAlert message={error} />}
      {loading && events.length === 0 && <p className="text-sm text-muted">Cargando eventos…</p>}
      {!loading && events.length === 0 && view !== "dia" && (
        <p role="status" className="hidden rounded-lg bg-surface-muted p-3 text-sm text-muted md:block">
          {filtered ? "Ningún evento coincide en este periodo." : "Sin eventos en este periodo."}
        </p>
      )}

      {view === "mes" && (
        <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
          <div className="grid grid-cols-7 border-b border-line bg-surface-muted/50 text-center text-xs font-medium text-muted">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="py-2">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const dayEvents = byDay.get(d) ?? [];
              const outside = !d.startsWith(month);
              return (
                <div key={d} className={`min-h-28 border-b border-r border-line p-1.5 ${outside ? "bg-surface-muted/40" : ""}`}>
                  <button
                    type="button"
                    onClick={() => go("dia", d)}
                    aria-label={`Ver el ${dayLabel(d)}`}
                    className={`mb-1 flex size-7 items-center justify-center rounded-full text-xs ${
                      d === today ? "bg-primary font-semibold text-white" : outside ? "text-muted" : "hover:bg-surface-muted"
                    }`}
                  >
                    {dayNumber(d)}
                  </button>
                  <div className="space-y-1">
                    {dayEvents.slice(0, MONTH_CELL_LIMIT).map((event) => (
                      <EventChip key={event.id} event={event} onSelect={setSelected} compact />
                    ))}
                    {dayEvents.length > MONTH_CELL_LIMIT && (
                      <button type="button" onClick={() => go("dia", d)} className="px-2 text-xs font-medium text-primary hover:underline">
                        +{dayEvents.length - MONTH_CELL_LIMIT} más
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "semana" && (
        <div className="hidden grid-cols-7 overflow-hidden rounded-xl border border-line bg-surface md:grid">
          {days.map((d, index) => (
            <div key={d} className="min-h-64 border-r border-line last:border-r-0">
              <button
                type="button"
                onClick={() => go("dia", d)}
                className={`flex w-full flex-col items-center border-b border-line py-2 text-xs hover:bg-surface-muted/50 ${
                  d === today ? "text-primary" : "text-muted"
                }`}
              >
                <span>{WEEKDAYS[index]}</span>
                <span className={`text-lg font-semibold ${d === today ? "" : "text-fg"}`}>{dayNumber(d)}</span>
              </button>
              <div className="space-y-1.5 p-1.5">
                {(byDay.get(d) ?? []).map((event) => (
                  <EventChip key={event.id} event={event} onSelect={setSelected} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Día en todas las pantallas; mes y semana como lista por día en celular. */}
      <div className={view === "dia" ? "" : "md:hidden"}>
        {daysWithEvents.length === 0 ? (
          !loading && (
            <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
              <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
                <Icon name="calendar" />
              </span>
              <p className="font-medium">{filtered ? "Ningún evento coincide en este periodo" : "Sin eventos en este periodo"}</p>
            </div>
          )
        ) : (
          <ul className="space-y-4">
            {daysWithEvents.map((d) => (
              <li key={d} className="rounded-xl border border-line bg-surface p-4">
                <h3 className={`mb-3 text-sm font-semibold ${d === today ? "text-primary" : ""}`}>
                  {dayLabel(d)}
                  {d === today && " · hoy"}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(byDay.get(d) ?? []).map((event) => (
                    <EventChip key={event.id} event={event} onSelect={setSelected} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && <EventSummaryModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
