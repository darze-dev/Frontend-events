"use client";

// Historial del evento (HU11, CA-11.5): cada cambio de planificación y de estado con quién, cuándo
// (hora de Lima) y qué cambió (antes → después). El responsable se traduce a nombre con la lista de
// coordinadores, que solo ve `events:manage`; si no se conoce, "Otro usuario".
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { ErrorAlert } from "@/components/ui/alert";
import { api, type Event, type EventChange, type EventStatus, type FieldChange } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { EVENT_ACTION_LABELS, EVENT_STATUS, formatDateTimeLima } from "@/lib/events";
import { formatDate, formatTime } from "@/lib/quotes";

const FIELD_LABELS: Record<string, string> = {
  event_date: "Fecha",
  start_time: "Hora de inicio",
  end_time: "Hora de fin",
  venue: "Lugar",
  guests: "Invitados",
  coordinator_id: "Responsable",
  status: "Estado",
};

const UNKNOWN_USER = "Otro usuario";

export function EventHistory({ event }: { event: Event }) {
  const { can } = useAuth();
  const [changes, setChanges] = useState<EventChange[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const manager = can("events:manage");

  useEffect(() => {
    let active = true;
    const path = { params: { path: { event_id: event.id } } };
    Promise.all([
      api.GET("/v1/events/{event_id}/changes", path),
      manager ? api.GET("/v1/events/coordinators") : Promise.resolve({ data: [] }),
    ]).then(([list, people]) => {
      if (!active) return;
      setChanges([...(list.data ?? [])].reverse()); // la API los da en orden; aquí, el más reciente primero
      if (list.error) setError(errorMessage(list.error));
      const known = new Map((people.data ?? []).map((c) => [c.id, c.name]));
      if (event.coordinator_name) known.set(event.coordinator_id, event.coordinator_name);
      setNames(known);
    });
    return () => {
      active = false;
    };
  }, [event.id, event.coordinator_id, event.coordinator_name, manager]);

  function show(field: string, value: FieldChange["before"]): string {
    const text = String(value);
    switch (field) {
      case "event_date":
        return formatDate(text);
      case "start_time":
      case "end_time":
        return formatTime(text);
      case "coordinator_id":
        return names.get(text) ?? UNKNOWN_USER;
      case "status":
        return EVENT_STATUS[text as EventStatus]?.label ?? text;
      default:
        return text;
    }
  }

  if (error) return <ErrorAlert message={error} />;
  if (!changes) return <p className="py-10 text-center text-sm text-muted">Cargando…</p>;

  return (
    <section aria-labelledby="history-title" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="history-title" className="mb-4 font-semibold">
        Historial de cambios
      </h2>
      {changes.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay cambios de planificación ni de estado.</p>
      ) : (
        <ol className="space-y-4">
          {changes.map((change, index) => (
            <li key={`${change.changed_at}-${index}`} className="border-l-2 border-line pl-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-sm font-medium">{EVENT_ACTION_LABELS[change.action]}</h3>
                <p className="text-xs text-muted">
                  {change.changed_by_name ?? names.get(change.changed_by) ?? UNKNOWN_USER} ·{" "}
                  <time dateTime={change.changed_at}>{formatDateTimeLima(change.changed_at)}</time>
                </p>
              </div>
              {change.fields.length > 0 && (
                <dl className="mt-2 space-y-1 text-sm">
                  {change.fields.map((f) => (
                    <div key={f.field} className="flex flex-wrap gap-x-2">
                      <dt className="text-muted">{FIELD_LABELS[f.field] ?? f.field}:</dt>
                      <dd>
                        <span className="text-muted line-through decoration-muted/60">{show(f.field, f.before)}</span>
                        <span aria-hidden> → </span>
                        <span className="sr-only"> cambió a </span>
                        <span>{show(f.field, f.after)}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
