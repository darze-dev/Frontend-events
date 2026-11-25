"use client";

// Editar la planificación del evento (HU11, CA-11.2): fecha, horario, lugar, invitados y responsable.
// Todos obligatorios; la fecha es hoy o futura. Solo programado o confirmado (R-EVT-6). No cambia el
// contrato ni la cotización (R-EVT-7). Si cambia la fecha u horario, el backend avisa con
// `staff_may_need_review` (R-EVT-9).
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth-provider";
import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Coordinator, type Event, type EventPlanning } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { todayInLima } from "@/lib/quotes";

const MAX_GUESTS = 10_000;
const VENUE_MAX = 300;

type Field = "event_date" | "start_time" | "end_time" | "venue" | "guests" | "coordinator_id";
type Props = { event: Event; onClose: () => void; onSaved: (planning: EventPlanning) => void };

export function PlanningForm({ event, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const today = todayInLima();
  const [values, setValues] = useState<Record<Field, string>>({
    event_date: event.event_date,
    start_time: event.start_time.slice(0, 5),
    end_time: event.end_time.slice(0, 5),
    venue: event.venue,
    guests: String(event.guests),
    coordinator_id: event.coordinator_id,
  });
  const [coordinators, setCoordinators] = useState<Coordinator[] | null>(null);
  const [invalid, setInvalid] = useState<Field[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.GET("/v1/events/coordinators").then(({ data, error: apiError }) => {
      setCoordinators(data ?? []);
      if (apiError) setError(errorMessage(apiError));
    });
  }, []);

  // Si el responsable actual ya no es coordinador (p. ej., desactivado), igual se muestra.
  const options =
    coordinators && !coordinators.some((c) => c.id === event.coordinator_id)
      ? [{ id: event.coordinator_id, name: event.coordinator_name ?? "Usuario desactivado" }, ...coordinators]
      : coordinators;

  const set = (field: Field) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setInvalid((list) => list.filter((f) => f !== field));
  };

  // CA-11.2: se revisa antes de enviar; el backend vuelve a validar.
  function validate(): { fields: Field[]; message: string } | null {
    const missing = (Object.keys(values) as Field[]).filter((f) => !values[f].trim());
    if (missing.length) return { fields: missing, message: "Completa todos los campos obligatorios." };
    if (values.event_date < today)
      return { fields: ["event_date"], message: "La fecha del evento debe ser hoy o una fecha futura." };
    if (values.start_time === values.end_time)
      return { fields: ["start_time", "end_time"], message: "La hora de inicio y la de fin no pueden ser iguales." };
    if (values.venue.trim().length > VENUE_MAX)
      return { fields: ["venue"], message: `El lugar no puede superar ${VENUE_MAX} caracteres.` };
    const guests = Number(values.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS)
      return { fields: ["guests"], message: "La cantidad de invitados debe estar entre 1 y 10 000." };
    return null;
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const problem = validate();
    if (problem) {
      setInvalid(problem.fields);
      setError(problem.message);
      document.getElementById(`planning-${problem.fields[0]}`)?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.PUT("/v1/events/{event_id}/planning", {
      params: { path: { event_id: event.id } },
      body: {
        event_date: values.event_date,
        start_time: values.start_time,
        end_time: values.end_time,
        venue: values.venue.trim(),
        guests: Number(values.guests),
        coordinator_id: values.coordinator_id,
      },
    });
    setSaving(false);
    if (data) onSaved(data);
    else setError(errorMessage(apiError));
  }

  const endsNextDay = Boolean(values.start_time && values.end_time && values.end_time < values.start_time);
  const fieldProps = (field: Field) => ({
    id: `planning-${field}`,
    value: values[field],
    required: true,
    "aria-invalid": invalid.includes(field) || undefined,
    "aria-describedby": invalid.includes(field) ? "planning-error" : undefined,
    className: fieldClass,
  });
  const required = <span className="text-danger">*</span>;

  return (
    <Modal title={`Editar planificación de ${event.code}`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="rounded-lg bg-surface-muted p-3 text-sm text-muted">
          No cambia el contrato {event.contract_code} ni la cotización: más invitados no recalculan el total.
        </p>
        <label className={labelClass}>
          Fecha {required}
          <input type="date" min={today} {...fieldProps("event_date")} onChange={(e) => set("event_date")(e.target.value)} autoFocus />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Hora de inicio {required}
            <input type="time" {...fieldProps("start_time")} onChange={(e) => set("start_time")(e.target.value)} />
          </label>
          <label className={labelClass}>
            Hora de fin {required}
            <input type="time" {...fieldProps("end_time")} onChange={(e) => set("end_time")(e.target.value)} />
          </label>
        </div>
        {endsNextDay && <p className="text-xs text-muted">Termina al día siguiente.</p>}
        <label className={labelClass}>
          Lugar {required}
          <input maxLength={VENUE_MAX} {...fieldProps("venue")} onChange={(e) => set("venue")(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Invitados {required}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_GUESTS}
              step={1}
              {...fieldProps("guests")}
              onChange={(e) => set("guests")(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Responsable de coordinación {required}
            <select {...fieldProps("coordinator_id")} disabled={!options} onChange={(e) => set("coordinator_id")(e.target.value)}>
              {!options && <option>Cargando…</option>}
              {options?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.id === user.id ? " (yo)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-muted">Si cambias la fecha o el horario, revisa luego el personal asignado.</p>
        {error && (
          <div id="planning-error">
            <ErrorAlert message={error} />
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || !options} className={primaryButton}>
            {saving ? "Guardando…" : "Guardar planificación"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
