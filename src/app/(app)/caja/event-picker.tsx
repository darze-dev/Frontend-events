"use client";

// Selector de evento opcional (RN16): se escribe parte del código o del cliente y se elige
// de la lista. Sirve para asociar un movimiento a un evento y para filtrar la caja.
import { useEffect, useId, useState } from "react";

import { Icon } from "@/components/icons";
import { fieldClass } from "@/components/ui/styles";
import { api, type EventSummary } from "@/lib/api/client";
import { formatDate } from "@/lib/quotes";

export type PickedEvent = { id: string; label: string };

export function eventLabel(event: Pick<EventSummary, "code" | "client_name" | "event_date">): string {
  return `${event.code} · ${event.client_name} · ${formatDate(event.event_date)}`;
}

type Props = { value: PickedEvent | null; onChange: (event: PickedEvent | null) => void; label: string };

export function EventPicker({ value, onChange, label }: Props) {
  const listId = useId();
  const [text, setText] = useState("");
  const [results, setResults] = useState<EventSummary[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value || !open) return;
    const timer = setTimeout(() => {
      void api
        .GET("/v1/events", { params: { query: { text, page: 1, page_size: 8 } } })
        .then(({ data }) => setResults(data?.items ?? []));
    }, 250);
    return () => clearTimeout(timer);
  }, [text, value, open]);

  if (value) {
    return (
      <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2">
        <p className="min-w-0 truncate text-sm">{value.label}</p>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setText("");
          }}
          aria-label={`Quitar evento ${value.label}`}
          className="shrink-0 rounded p-1 text-muted hover:text-fg"
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 mt-[3px] size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        role="combobox"
        aria-autocomplete="list"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Código o cliente"
        aria-label={label}
        aria-controls={listId}
        aria-expanded={open}
        className={`${fieldClass} pl-9`}
      />
      {open && (
        <ul id={listId} className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-lg">
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">Sin resultados.</li>
          ) : (
            results.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ id: event.id, label: eventLabel(event) });
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-surface-muted"
                >
                  <span className="block text-sm font-medium">{event.code}</span>
                  <span className="block text-xs text-muted">
                    {event.client_name} · {formatDate(event.event_date)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
