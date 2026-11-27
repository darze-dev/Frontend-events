"use client";

// Asignaciones del evento para el administrador (HU17): trabajador, función, horario y pago
// acordado. Asignar, editar y anular (con motivo) con `staff:assign`, mientras el evento esté
// programado, confirmado o en ejecución; después queda de solo lectura (R-ASG-10).
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { primaryButton } from "@/components/ui/styles";
import { api, type Assignment, type Event } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatSoles } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/quotes";
import { ASSIGNABLE_STATUSES, functionLabel } from "@/lib/staff";

import { AssignmentCancelForm } from "./assignment-cancel-form";
import { AssignmentForm } from "./assignment-form";

export function EventAssignments({ event }: { event: Event }) {
  const { can } = useAuth();
  const canWrite = can("staff:assign") && ASSIGNABLE_STATUSES.includes(event.status);
  const [items, setItems] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Assignment | "new" | null>(null);
  const [cancelling, setCancelling] = useState<Assignment | null>(null);

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/staff/assignments", {
      params: { query: { event_id: event.id } },
    });
    setItems(data?.items ?? []);
    setError(apiError ? errorMessage(apiError) : null);
  }, [event.id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const total = (items ?? []).reduce((sum, a) => sum + a.pay_cents, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {canWrite
            ? "Quién trabaja en este evento, con qué función, en qué horario y cuánto se acordó pagarle."
            : "Las asignaciones de un evento finalizado o cancelado son de solo lectura."}
        </p>
        {canWrite && (
          <button type="button" onClick={() => setEditing("new")} className={primaryButton}>
            <Icon name="plus" className="size-4" />
            Asignar trabajador
          </button>
        )}
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
          <Icon name="check" className="size-4 shrink-0" />
          {notice}
        </div>
      )}
      {error && <ErrorAlert message={error} />}

      {items === null ? (
        <p className="py-10 text-center text-sm text-muted">Cargando personal…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="idCard" />
          </span>
          <p className="font-medium">Todavía no hay personal asignado a este evento</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-line bg-surface-muted/50 text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Trabajador</th>
                <th scope="col" className="px-2 py-2.5 font-medium">Función</th>
                <th scope="col" className="px-2 py-2.5 font-medium">Horario</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium">Pago acordado</th>
                {canWrite && (
                  <th scope="col" className="px-4 py-2.5">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-4 py-3 align-top font-medium">{assignment.worker_name}</td>
                  <td className="px-2 py-3 align-top">{functionLabel(assignment)}</td>
                  <td className="whitespace-nowrap px-2 py-3 align-top tabular-nums">
                    {formatDate(assignment.date)}
                    <span className="block text-xs text-muted">
                      {formatTime(assignment.start_time)} – {formatTime(assignment.end_time)}
                      {assignment.end_time < assignment.start_time ? " (día siguiente)" : ""}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums">
                    {formatSoles(assignment.pay_cents)}
                  </td>
                  {canWrite && (
                    <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                      <button
                        type="button"
                        onClick={() => setEditing(assignment)}
                        aria-label={`Editar la asignación de ${assignment.worker_name}`}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelling(assignment)}
                        aria-label={`Anular la asignación de ${assignment.worker_name}`}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
                      >
                        Anular
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line bg-surface-muted/50 text-sm">
              <tr>
                <th scope="row" colSpan={3} className="px-4 py-2.5 text-left font-medium">
                  Total acordado
                </th>
                <td className="whitespace-nowrap px-2 py-2.5 text-right font-medium tabular-nums">{formatSoles(total)}</td>
                {canWrite && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">El pago acordado no es un egreso: se registra en Caja cuando se paga.</p>

      {editing && (
        <AssignmentForm
          event={event}
          assignment={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice(editing === "new" ? "Trabajador asignado." : "Asignación actualizada.");
            setEditing(null);
            void load();
          }}
        />
      )}

      {cancelling && (
        <AssignmentCancelForm
          assignment={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => {
            setNotice("Asignación anulada.");
            setCancelling(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
