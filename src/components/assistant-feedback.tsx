"use client";

// Valoración de una respuesta del asistente (HU40): "Correcta" o "Incorrecta", con el estado elegido.
// Se puede cambiar de opinión: el backend guarda cada valoración y vale la última.
import { useState } from "react";

import { api, type AssistantFeedbackValue } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { FEEDBACK_LABELS } from "@/lib/assistant";

import { Icon } from "./icons";

const OPTIONS: { value: AssistantFeedbackValue; icon: "thumbUp" | "thumbDown"; label: string; active: string }[] = [
  {
    value: "correct",
    icon: "thumbUp",
    label: "Marcar respuesta como correcta",
    active: "border-success bg-success/10 text-success",
  },
  {
    value: "incorrect",
    icon: "thumbDown",
    label: "Marcar respuesta como incorrecta",
    active: "border-danger bg-danger/10 text-danger",
  },
];

export function FeedbackButtons({
  queryId,
  value,
  onRated,
}: {
  queryId: string;
  value: AssistantFeedbackValue | null;
  onRated: (value: AssistantFeedbackValue) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rate = async (next: AssistantFeedbackValue) => {
    if (saving || next === value) return;
    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = await api.POST("/v1/assistant/queries/{query_id}/feedback", {
        params: { path: { query_id: queryId } },
        body: { value: next },
      });
      if (data) onRated(data.value);
      else setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1 px-1">
      <div role="group" aria-label="¿Fue útil esta respuesta?" className="flex flex-wrap items-center gap-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => void rate(option.value)}
              disabled={saving}
              aria-pressed={selected}
              aria-label={option.label}
              title={option.label}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition disabled:opacity-60 ${
                selected ? option.active : "border-line text-muted hover:bg-surface-muted hover:text-fg"
              }`}
            >
              <Icon name={option.icon} className="size-3.5" />
              {FEEDBACK_LABELS[option.value]}
            </button>
          );
        })}
        {value && (
          <span role="status" className="text-xs text-muted">
            Marcada como {FEEDBACK_LABELS[value].toLowerCase()}
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// Valoración ya hecha, solo para mostrar (historial propio y del administrador).
export function FeedbackBadge({ value }: { value: AssistantFeedbackValue | null | undefined }) {
  if (!value) return <span className="text-xs text-muted">Sin valorar</span>;
  const correct = value === "correct";
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        correct ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
      }`}
    >
      <Icon name={correct ? "thumbUp" : "thumbDown"} className="size-3.5" />
      {FEEDBACK_LABELS[value]}
    </span>
  );
}
