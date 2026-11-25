"use client";

// Editar una observación de la bitácora (HU13, R-ACT-1): queda quién la editó por última vez y cuándo.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Note } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = { note: Note; onClose: () => void; onSaved: (note: Note) => void };

export function NoteEditForm({ note, onClose, onSaved }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await api.PUT("/v1/notes/{note_id}", {
      params: { path: { note_id: note.id } },
      body: { text: String(new FormData(formEvent.currentTarget).get("text") ?? "").trim() },
    });
    setSaving(false);
    if (data) onSaved(data);
    else setError(errorMessage(apiError));
  }

  return (
    <Modal title="Editar observación" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className={labelClass}>
          Observación <span className="text-danger">*</span>
          <textarea
            name="text"
            required
            rows={5}
            maxLength={1000}
            defaultValue={note.text}
            autoFocus
            className={fieldClass}
          />
          <span className="mt-1 block text-xs font-normal text-muted">Hasta 1000 caracteres.</span>
        </label>
        {error && <ErrorAlert message={error} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
