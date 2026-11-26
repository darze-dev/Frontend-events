"use client";

// "Mis consultas" (HU40): las conversaciones anteriores del propio usuario, paginadas, con la
// valoración que dio a cada respuesta. Solo se ven las propias; nadie las modifica.
import { useCallback, useEffect, useState } from "react";

import { api, type MyQuery } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { MY_QUERIES_PAGE_SIZE, toolSummary } from "@/lib/assistant";

import { FeedbackBadge } from "./assistant-feedback";
import { Icon } from "./icons";
import { ErrorAlert } from "./ui/alert";

const dateTime = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

export function AssistantHistory() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MyQuery[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/assistant/my-queries", {
        params: { query: { page, page_size: MY_QUERIES_PAGE_SIZE } },
      });
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setError(errorMessage(null));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / MY_QUERIES_PAGE_SIZE));

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {error && <ErrorAlert message={error} />}
      {loading && items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Cargando tus consultas…</p>
      ) : items.length === 0 && !error ? (
        <p className="py-6 text-center text-sm text-muted">Aún no has hecho consultas al asistente.</p>
      ) : (
        <ul className="space-y-2" aria-label="Mis consultas">
          {items.map((entry) => {
            const isOpen = expanded === entry.id;
            return (
              <li key={entry.id} className="rounded-xl border border-line p-3 text-sm">
                <p className="text-xs tabular-nums text-muted">{dateTime.format(new Date(entry.created_at))}</p>
                <p className="mt-1 break-words font-medium">{entry.question}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <FeedbackBadge value={entry.feedback?.value} />
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : entry.id)}
                    aria-expanded={isOpen}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Icon name={isOpen ? "chevronDown" : "chevronRight"} className="size-3.5" />
                    {isOpen ? "Ocultar respuesta" : "Ver respuesta"}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-2 space-y-1 border-t border-line pt-2">
                    <p className="whitespace-pre-wrap break-words">{entry.answer || "Sin respuesta"}</p>
                    {entry.tools.length > 0 && (
                      <p className="text-xs text-muted">Consultó: {toolSummary(entry.tools)}</p>
                    )}
                    {entry.feedback?.comment && (
                      <p className="text-xs text-muted">Tu comentario: {entry.feedback.comment}</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {total > MY_QUERIES_PAGE_SIZE && (
        <nav aria-label="Páginas de mis consultas" className="flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || loading}
            aria-label="Página anterior"
            className="rounded-lg border border-line p-1.5 hover:bg-surface-muted disabled:opacity-60"
          >
            <Icon name="chevronLeft" className="size-4" />
          </button>
          <span className="tabular-nums text-muted">
            {page} / {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= pages || loading}
            aria-label="Página siguiente"
            className="rounded-lg border border-line p-1.5 hover:bg-surface-muted disabled:opacity-60"
          >
            <Icon name="chevronRight" className="size-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
