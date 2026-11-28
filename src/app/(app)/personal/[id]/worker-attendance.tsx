"use client";

// Historial de asistencia del trabajador (HU18): una fila por asignación, de la más reciente a la
// más antigua, con fecha, evento, función, horario, pago acordado y asistencia. Se filtra por
// fechas del evento y se pagina de 20 en 20. Solo el administrador (`staff:manage`) lo consulta y
// solo él registra o corrige (`staff:attendance`).
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { AttendanceForm } from "@/components/attendance-form";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { Tag } from "@/components/ui/tag";
import { fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type Attendance } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { ATTENDANCE_PENDING, ATTENDANCE_STATUS, attendanceDue } from "@/lib/attendance";
import { EVENT_STATUS } from "@/lib/events";
import { formatSoles } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/quotes";
import { functionLabel } from "@/lib/staff";

const PAGE_SIZE = 20;

type Filters = { from: string; to: string };

export function WorkerAttendance({ workerId, workerName }: { workerId: string; workerName: string }) {
  const { can } = useAuth();
  const canRecord = can("staff:attendance");
  const [filters, setFilters] = useState<Filters>({ from: "", to: "" });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Attendance[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recording, setRecording] = useState<Attendance | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error: apiError } = await api.GET("/v1/staff/workers/{worker_id}/attendance", {
        params: {
          path: { worker_id: workerId },
          query: { from: filters.from || undefined, to: filters.to || undefined, page, page_size: PAGE_SIZE },
        },
      });
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setItems([]);
      setError(errorMessage(null));
    }
  }, [workerId, filters, page]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get("from") ?? "");
    const to = String(form.get("to") ?? "");
    if (from && to && from > to) return setError("La fecha «desde» no puede ser posterior a la fecha «hasta».");
    setPage(1);
    setFilters({ from, to });
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const counts = (items ?? []).reduce(
    (acc, row) => {
      if (row.assignment_status === "CANCELLED") return acc;
      if (row.attendance_status === "ATTENDED") acc.attended += 1;
      else if (row.attendance_status === "NOT_ATTENDED") acc.missed += 1;
      else acc.pending += 1;
      return acc;
    },
    { attended: 0, missed: 0, pending: 0 },
  );

  return (
    <section aria-labelledby="historial-asistencia" className="space-y-4">
      <div>
        <h2 id="historial-asistencia" className="text-lg font-semibold">
          Historial de asistencia
        </h2>
        <p className="text-sm text-muted">
          Cada evento en el que fue asignado y si cumplió. «Sin registrar» no es una falta.
        </p>
      </div>

      <form onSubmit={applyFilters} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className={labelClass}>
          Desde
          <input type="date" name="from" defaultValue={filters.from} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Hasta
          <input type="date" name="to" defaultValue={filters.to} className={fieldClass} />
        </label>
        <button type="submit" className={secondaryButton}>
          <Icon name="search" className="size-4" />
          Filtrar
        </button>
      </form>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
          <Icon name="check" className="size-4 shrink-0" />
          {notice}
        </div>
      )}
      {error && <ErrorAlert message={error} />}

      {items === null ? (
        <p className="py-10 text-center text-sm text-muted">Cargando historial…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
          <p className="font-medium">
            {filters.from || filters.to ? "No hay asignaciones en ese rango de fechas" : "Todavía no tiene asignaciones"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            En esta página: <span className="font-medium text-success">{counts.attended} cumplió</span> ·{" "}
            <span className="font-medium text-danger">{counts.missed} no cumplió</span> · {counts.pending} sin registrar
          </p>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-line bg-surface-muted/50 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Fecha</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Evento</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Función</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Horario</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-medium">Pago acordado</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Asistencia</th>
                  {canRecord && (
                    <th scope="col" className="px-4 py-2.5">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((row) => {
                  const cancelled = row.assignment_status === "CANCELLED";
                  const tag = row.attendance_status ? ATTENDANCE_STATUS[row.attendance_status] : ATTENDANCE_PENDING;
                  return (
                    <tr key={row.assignment_id} className={cancelled ? "text-muted" : undefined}>
                      <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums">
                        {row.event_date ? formatDate(row.event_date) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 align-top">
                        {row.event_code ? (
                          <Link href={`/eventos/${row.event_id}`} className="font-medium text-primary hover:underline">
                            {row.event_code}
                          </Link>
                        ) : (
                          <span className="text-muted">No disponible</span>
                        )}
                        {row.event_status && (
                          <span className="block text-xs text-muted">{EVENT_STATUS[row.event_status].label}</span>
                        )}
                      </td>
                      <td className="px-2 py-3 align-top">{functionLabel(row)}</td>
                      <td className="whitespace-nowrap px-2 py-3 align-top tabular-nums">
                        {formatTime(row.start_time)} – {formatTime(row.end_time)}
                        {row.end_time < row.start_time ? " (día siguiente)" : ""}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums">
                        {formatSoles(row.pay_cents)}
                      </td>
                      <td className="px-2 py-3 align-top">
                        {cancelled ? (
                          <Tag label="Asignación anulada" className="bg-surface-muted text-muted" />
                        ) : (
                          <Tag label={tag.label} className={tag.className} />
                        )}
                      </td>
                      {canRecord && (
                        <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                          {attendanceDue(row) && (
                            <button
                              type="button"
                              onClick={() => setRecording(row)}
                              className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
                            >
                              {row.attendance_status ? "Corregir" : "Registrar"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">
                Página {page} de {pages} · {total} asignaciones
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className={secondaryButton}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage(page + 1)}
                  className={secondaryButton}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {recording && (
        <AttendanceForm
          assignmentId={recording.assignment_id}
          workerName={workerName}
          current={recording.attendance_status ?? null}
          onClose={() => setRecording(null)}
          onDone={() => {
            setNotice(recording.attendance_status ? "Asistencia corregida." : "Asistencia registrada.");
            setRecording(null);
            void load();
          }}
        />
      )}
    </section>
  );
}
