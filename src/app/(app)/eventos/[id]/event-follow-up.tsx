"use client";

// Seguimiento del evento (HU13): lista de actividades (pendiente / completada) y bitácora de
// observaciones. R-ACT-2: actividades en programado, confirmado o en ejecución; observaciones también
// con el evento finalizado; cancelado = solo lectura. R-ACT-6: edita su autor o un administrador.
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Activity, type Event, type Note } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatDateTimeLima } from "@/lib/events";

import { ActivityForm } from "./activity-form";
import { NoteEditForm } from "./note-edit-form";

const ACTIVITY_STATES: Event["status"][] = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"];

export function EventFollowUp({ event }: { event: Event }) {
  const { user, can } = useAuth();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reassigning, setReassigning] = useState<Activity | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const manageActivities = ACTIVITY_STATES.includes(event.status) && can("events:manage");
  const writeNotes = event.status !== "CANCELLED" && can("event_notes:write");
  const canEdit = (note: Note) => writeNotes && (note.created_by === user.id || can("event_notes:edit_any"));

  const load = useCallback(async () => {
    const path = { params: { path: { event_id: event.id } } };
    const [acts, logs] = await Promise.all([
      api.GET("/v1/events/{event_id}/activities", path),
      api.GET("/v1/events/{event_id}/notes", path),
    ]);
    setActivities(acts.data ?? []);
    setNotes(logs.data ?? []);
    if (acts.error || logs.error) setError(errorMessage(acts.error ?? logs.error));
  }, [event.id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const replaceActivity = (updated: Activity) =>
    setActivities((list) => list?.map((a) => (a.id === updated.id ? updated : a)) ?? [updated]);

  async function toggle(activity: Activity) {
    setToggling(activity.id);
    setError(null);
    const params = { params: { path: { activity_id: activity.id } } };
    const { data, error: apiError } =
      activity.status === "DONE"
        ? await api.POST("/v1/activities/{activity_id}/reopen", params)
        : await api.POST("/v1/activities/{activity_id}/complete", params);
    setToggling(null);
    if (data) replaceActivity(data);
    else setError(errorMessage(apiError));
  }

  async function addNote(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSavingNote(true);
    setError(null);
    const { data, error: apiError } = await api.POST("/v1/events/{event_id}/notes", {
      params: { path: { event_id: event.id } },
      body: { text: noteText.trim() },
    });
    setSavingNote(false);
    if (data) {
      setNotes((list) => [data, ...(list ?? [])]);
      setNoteText("");
    } else setError(errorMessage(apiError));
  }

  const readOnlyNotice =
    event.status === "CANCELLED"
      ? "El evento está cancelado: el seguimiento queda solo para consulta."
      : event.status === "FINISHED"
        ? "El evento finalizó: las actividades ya no cambian, pero aún se agregan observaciones."
        : null;

  return (
    <div className="space-y-6">
      {readOnlyNotice && (
        <p role="status" className="rounded-lg bg-surface-muted p-3 text-sm text-muted">
          {readOnlyNotice}
        </p>
      )}
      {error && <ErrorAlert message={error} />}

      <section aria-labelledby="activities-title" className="rounded-xl border border-line bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="activities-title" className="font-semibold">
            Actividades
          </h2>
          {manageActivities && (
            <button type="button" onClick={() => setCreating(true)} className={secondaryButton}>
              <Icon name="plus" className="size-4" />
              Nueva actividad
            </button>
          )}
        </div>
        {!activities ? (
          <p className="py-4 text-sm text-muted">Cargando…</p>
        ) : activities.length === 0 ? (
          <p className="py-4 text-sm text-muted">Aún no hay actividades registradas.</p>
        ) : (
          <ul className="divide-y divide-line">
            {activities.map((activity) => {
              const done = activity.status === "DONE";
              return (
                <li key={activity.id} className="flex items-start gap-3 py-3">
                  <input
                    type="checkbox"
                    id={`activity-${activity.id}`}
                    checked={done}
                    disabled={!manageActivities || toggling === activity.id}
                    onChange={() => void toggle(activity)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <label htmlFor={`activity-${activity.id}`} className={done ? "text-muted line-through" : ""}>
                      {activity.description}
                      <span className="sr-only">{done ? " (completada)" : " (pendiente)"}</span>
                    </label>
                    <p className="mt-1 text-xs text-muted">
                      Responsable: {activity.responsible_name ?? "Usuario desactivado"}
                      {done && activity.completed_at && (
                        <>
                          {" · "}Completada por {activity.completed_by_name ?? "usuario desactivado"} el{" "}
                          {formatDateTimeLima(activity.completed_at)}
                        </>
                      )}
                    </p>
                  </div>
                  {/* Una actividad completada ya no cambia de responsable. */}
                  {manageActivities && !done && (
                    <button
                      type="button"
                      onClick={() => setReassigning(activity)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs text-primary hover:bg-surface-muted"
                    >
                      Cambiar responsable
                      <span className="sr-only">: {activity.description}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="notes-title" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="notes-title" className="mb-3 font-semibold">
          Bitácora de observaciones
        </h2>
        {writeNotes && (
          <form onSubmit={addNote} className="mb-4 space-y-2">
            <label htmlFor="new-note" className="sr-only">
              Nueva observación
            </label>
            <textarea
              id="new-note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              required
              rows={3}
              maxLength={1000}
              placeholder="Escribe una observación o indicación del cliente…"
              className={fieldClass}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted">{noteText.length}/1000</span>
              <button type="submit" disabled={savingNote || !noteText.trim()} className={primaryButton}>
                {savingNote ? "Guardando…" : "Agregar observación"}
              </button>
            </div>
          </form>
        )}
        {!notes ? (
          <p className="py-4 text-sm text-muted">Cargando…</p>
        ) : notes.length === 0 ? (
          <p className="py-4 text-sm text-muted">Aún no hay observaciones.</p>
        ) : (
          <ol className="divide-y divide-line">
            {notes.map((note) => (
              <li key={note.id} className="py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-muted">
                    <span className="font-medium text-fg">{note.created_by_name ?? "Usuario desactivado"}</span>
                    {" · "}
                    <time dateTime={note.created_at}>{formatDateTimeLima(note.created_at)}</time>
                    {note.edited_at && (
                      <span
                        title={`Editado por ${note.edited_by_name ?? "usuario desactivado"} el ${formatDateTimeLima(note.edited_at)}`}
                      >
                        {" · "}editado
                      </span>
                    )}
                  </p>
                  {canEdit(note) && (
                    <button
                      type="button"
                      onClick={() => setEditing(note)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary hover:bg-surface-muted"
                    >
                      <Icon name="pencil" className="size-3.5" />
                      Editar<span className="sr-only"> observación</span>
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-line">{note.text}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {(creating || reassigning) && (
        <ActivityForm
          eventId={event.id}
          activity={reassigning ?? undefined}
          onClose={() => {
            setCreating(false);
            setReassigning(null);
          }}
          onSaved={(saved) => {
            if (reassigning) replaceActivity(saved);
            else setActivities((list) => [...(list ?? []), saved]);
            setCreating(false);
            setReassigning(null);
          }}
        />
      )}
      {editing && (
        <NoteEditForm
          note={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setNotes((list) => list?.map((n) => (n.id === saved.id ? saved : n)) ?? [saved]);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
