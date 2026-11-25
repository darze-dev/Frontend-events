"use client";

// Estados del evento (HU11, CA-11.4): programado → confirmado → en ejecución → finalizado, uno a la
// vez y sin volver atrás. Cancelado queda aparte. Con `events:manage`, el botón del siguiente paso
// pide confirmación. "Iniciar" solo el día del evento (R-EVT-8); si no, el backend responde
// `event.not_event_day` y se muestra su mensaje.
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { primaryButton } from "@/components/ui/styles";
import { api, type Event } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { EVENT_STATUS, EVENT_STEPS, NEXT_STEP, isEventDay } from "@/lib/events";
import { todayInLima } from "@/lib/quotes";

type Props = { event: Event; onChanged: (event: Event, notice: string) => void };

export function EventStepper({ event, onChanged }: Props) {
  const { can } = useAuth();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelled = event.status === "CANCELLED";
  const current = EVENT_STEPS.indexOf(event.status as (typeof EVENT_STEPS)[number]);
  const next = can("events:manage") ? NEXT_STEP[event.status] : undefined;
  const notToday = next?.action === "start" && !isEventDay(event, todayInLima());

  async function advance() {
    if (!next) return;
    setError(null);
    const params = { params: { path: { event_id: event.id } } };
    const { data, error: apiError } =
      next.action === "confirm"
        ? await api.POST("/v1/events/{event_id}/confirm", params)
        : next.action === "start"
          ? await api.POST("/v1/events/{event_id}/start", params)
          : await api.POST("/v1/events/{event_id}/finish", params);
    setAsking(false);
    if (data) onChanged(data, next.done);
    else setError(errorMessage(apiError));
  }

  return (
    <section aria-labelledby="event-steps-title" className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 id="event-steps-title" className="sr-only">
            Estado del evento
          </h2>
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {EVENT_STEPS.map((step, index) => {
              const done = !cancelled && index < current;
              const active = !cancelled && index === current;
              return (
                <li key={step} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
                  {index > 0 && <span aria-hidden className={`h-px w-4 sm:w-8 ${done || active ? "bg-primary" : "bg-line"}`} />}
                  <span
                    aria-hidden
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      done
                        ? "bg-primary text-white"
                        : active
                          ? "border-2 border-primary text-primary"
                          : "border border-line text-muted"
                    }`}
                  >
                    {done ? <Icon name="check" className="size-3.5" /> : index + 1}
                  </span>
                  <span className={`text-sm ${active ? "font-semibold text-fg" : done ? "text-fg" : "text-muted"}`}>
                    {EVENT_STATUS[step].label}
                    <span className="sr-only">{done ? " (completado)" : active ? " (estado actual)" : " (pendiente)"}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          {cancelled && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-sm font-medium text-danger">
              <Icon name="close" className="size-4" />
              Cancelado: el evento ya no avanza de estado.
            </p>
          )}
        </div>
        {next && (
          <div className="flex flex-col items-start gap-1 md:items-end">
            <button
              type="button"
              onClick={() => setAsking(true)}
              disabled={notToday}
              aria-describedby={notToday ? "event-step-hint" : undefined}
              className={primaryButton}
            >
              <Icon name="chevronRight" className="size-4" />
              {next.label}
            </button>
            {notToday && (
              <p id="event-step-hint" className="text-xs text-muted">
                Se habilita el día del evento.
              </p>
            )}
          </div>
        )}
      </div>
      {error && (
        <div className="mt-3">
          <ErrorAlert message={error} />
        </div>
      )}
      {asking && next && (
        <ConfirmDialog
          title={`¿${next.label}?`}
          message={next.question}
          confirmLabel={next.label}
          tone="primary"
          onConfirm={advance}
          onClose={() => setAsking(false)}
        />
      )}
    </section>
  );
}
