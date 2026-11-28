"use client";

// Consulta de disponibilidad (HU16, CA-16.3 a CA-16.12): fecha obligatoria, horas opcionales (sin
// hora = día completo en Lima), filtros por función y estado. Solo lectura. El rango máximo es de
// 31 días; si se excede, el backend lo rechaza y se muestra su mensaje.
import { useState, type FormEvent } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { Tag } from "@/components/ui/tag";
import { fieldClass, labelClass, primaryButton } from "@/components/ui/styles";
import { api, type AvailabilityItem, type AvailabilityState, type WorkerFunction } from "@/lib/api/client";
import {
  AVAILABILITY_STATES,
  MAX_RANGE_DAYS,
  conflictFunction,
  formatInterval,
  formatSchedule,
  kindLabel,
  lastAllowedDate,
} from "@/lib/availability";
import { errorMessage } from "@/lib/api/errors";
import { formatDate, todayInLima } from "@/lib/quotes";
import { WORKER_FUNCTIONS, functionLabel } from "@/lib/staff";

import { EventCodeLink } from "./event-code-link";

type Result = { items: AvailabilityItem[]; label: string };

export function AvailabilityQuery() {
  const [fromDate, setFromDate] = useState(todayInLima);
  const [toDate, setToDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [workerFunction, setWorkerFunction] = useState<WorkerFunction | "">("");
  const [state, setState] = useState<AvailabilityState | "">("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const to = toDate || fromDate;
    const problem =
      (!fromDate ? "Elige la fecha de la consulta." : null) ??
      (to < fromDate ? "La fecha final no puede ser anterior a la inicial." : null) ??
      (Boolean(startTime) !== Boolean(endTime) ? "Indica la hora de inicio y la de fin, o deja ambas vacías para el día completo." : null);
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await api.GET("/v1/staff/availability", {
        params: {
          query: {
            from_date: fromDate,
            to_date: to,
            start_time: startTime || null,
            end_time: endTime || null,
            function: workerFunction || null,
            state: state || null,
          },
        },
      });
      if (data) {
        const days = to === fromDate ? formatDate(fromDate) : `${formatDate(fromDate)} al ${formatDate(to)}`;
        const hours = startTime && endTime ? `, de ${startTime} a ${endTime}` : ", día completo";
        setResult({ items: data.items, label: `${days}${hours}` });
      } else {
        setResult(null);
        setError(errorMessage(apiError));
      }
    } catch {
      setResult(null);
      setError(errorMessage(null));
    } finally {
      setLoading(false);
    }
  }

  const counts = (result?.items ?? []).reduce(
    (sum, item) => ({ ...sum, [item.state]: sum[item.state] + 1 }),
    { FREE: 0, BUSY: 0, UNAVAILABLE: 0 } as Record<AvailabilityState, number>,
  );

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>
            Fecha <span className="text-danger">*</span>
            <input
              type="date"
              required
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Hasta <span className="font-normal text-muted">(opcional)</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              max={fromDate ? lastAllowedDate(fromDate) : undefined}
              onChange={(e) => setToDate(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Hora de inicio <span className="font-normal text-muted">(opcional)</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Hora de fin <span className="font-normal text-muted">(opcional)</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={fieldClass} />
          </label>
        </div>
        <p className="text-xs text-muted">
          Sin horas se consulta el día completo. Si la hora de fin es menor que la de inicio, termina al día siguiente.
          El rango máximo es de {MAX_RANGE_DAYS} días.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>
            Función
            <select
              value={workerFunction}
              onChange={(e) => setWorkerFunction(e.target.value as WorkerFunction | "")}
              className={fieldClass}
            >
              <option value="">Todas</option>
              {(Object.keys(WORKER_FUNCTIONS) as WorkerFunction[]).map((value) => (
                <option key={value} value={value}>
                  {WORKER_FUNCTIONS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Estado
            <select value={state} onChange={(e) => setState(e.target.value as AvailabilityState | "")} className={fieldClass}>
              <option value="">Todos</option>
              {(Object.keys(AVAILABILITY_STATES) as AvailabilityState[]).map((value) => (
                <option key={value} value={value}>
                  {AVAILABILITY_STATES[value].label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-2 lg:justify-end">
            <button type="submit" disabled={loading} className={`${primaryButton} w-full sm:w-auto`}>
              <Icon name="search" className="size-4" />
              {loading ? "Consultando…" : "Consultar"}
            </button>
          </div>
        </div>
      </form>

      {error && <ErrorAlert message={error} />}

      {result &&
        (result.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
            <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
              <Icon name="idCard" />
            </span>
            <p className="font-medium">Ningún trabajador cumple la consulta</p>
            <p className="mt-1 text-sm text-muted">Prueba con otra fecha, función o estado. Solo se consideran trabajadores activos.</p>
          </div>
        ) : (
          <section aria-label="Resultado" className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-medium">
                {result.items.length} {result.items.length === 1 ? "trabajador" : "trabajadores"} · {result.label}
              </h2>
              <p className="flex flex-wrap gap-2 text-xs">
                {(Object.keys(AVAILABILITY_STATES) as AvailabilityState[]).map((value) => (
                  <Tag
                    key={value}
                    label={`${AVAILABILITY_STATES[value].label}: ${counts[value]}`}
                    className={AVAILABILITY_STATES[value].className}
                  />
                ))}
              </p>
            </div>
            <ul className="space-y-3">
              {result.items.map((item) => (
                <li key={item.worker_id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted">{functionLabel(item)}</p>
                    </div>
                    <Tag label={AVAILABILITY_STATES[item.state].label} className={AVAILABILITY_STATES[item.state].className} />
                  </div>
                  {item.unavailabilities.length > 0 && (
                    <div className="mt-3 border-t border-line pt-3 text-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">No disponible</p>
                      <ul className="mt-1 space-y-0.5">
                        {item.unavailabilities.map((unavailability) => (
                          <li key={unavailability.id}>
                            <span className="font-medium">{kindLabel(unavailability)}</span>
                            <span className="text-muted"> · {formatInterval(unavailability.start_at, unavailability.end_at)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {item.conflicts.length > 0 && (
                    <div className="mt-3 border-t border-line pt-3 text-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">Asignado a</p>
                      <ul className="mt-1 space-y-0.5">
                        {item.conflicts.map((conflict, index) => (
                          <li key={index}>
                            {conflict.event_code ? <EventCodeLink code={conflict.event_code} /> : <span className="text-muted">Evento sin código</span>}
                            <span className="text-muted">
                              {conflict.event_date ? ` · ${formatDate(conflict.event_date)}` : ""} ·{" "}
                              {formatSchedule(conflict.start_time, conflict.end_time)}
                              {conflictFunction(conflict) ? ` · ${conflictFunction(conflict)}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
