"use client";

// Personal designado del evento, solo lectura (feature 025): nombre del trabajador, función y
// horario. Sale de la ficha del evento, que nunca trae pago, documento, teléfono ni tarifa.
import { useCallback, useEffect, useState } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Icon } from "@/components/icons";
import { api, type Event, type SheetStaff } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatShiftLima } from "@/lib/events";

export function EventRoster({ event }: { event: Event }) {
  const [staff, setStaff] = useState<SheetStaff[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/reports/events/{event_id}/sheet", {
      params: { path: { event_id: event.id } },
    });
    setStaff(data?.staff ?? []);
    setError(apiError ? errorMessage(apiError) : null);
  }, [event.id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Quién está designado para este evento y con qué función.</p>
      {error && <ErrorAlert message={error} />}
      {staff === null ? (
        <p className="py-10 text-center text-sm text-muted">Cargando personal…</p>
      ) : staff.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="idCard" />
          </span>
          <p className="font-medium">Todavía no hay personal designado para este evento</p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface px-5">
          {staff.map((member) => (
            <li
              key={`${member.worker_id}-${member.starts_at}`}
              className="flex flex-wrap items-baseline justify-between gap-x-3 py-3 text-sm"
            >
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
    </div>
  );
}
