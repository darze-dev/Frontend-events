// Un evento dentro del calendario: horario, cliente, tipo y estado (CA-12.2).
// Los cancelados se ven en gris y tachados (CA-12.5).
import type { EventSummary } from "@/lib/api/client";
import { EVENT_STATUS, formatSchedule } from "@/lib/events";
import { EVENT_TYPE_LABELS, formatTime } from "@/lib/quotes";

type Props = { event: EventSummary; onSelect: (event: EventSummary) => void; compact?: boolean };

export function EventChip({ event, onSelect, compact = false }: Props) {
  const cancelled = event.status === "CANCELLED";
  const color = cancelled ? "bg-surface-muted text-muted line-through" : EVENT_STATUS[event.status].className;
  const label = `${event.code}: ${formatSchedule(event)}, ${event.client_name}, ${EVENT_TYPE_LABELS[event.event_type]}, ${EVENT_STATUS[event.status].label}`;
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      aria-label={label}
      title={label}
      className={`block w-full rounded-md px-2 py-1 text-left text-xs hover:ring-2 hover:ring-primary/40 ${color}`}
    >
      {compact ? (
        <>
          <span className="block truncate">
            <span className="font-semibold tabular-nums">{formatTime(event.start_time)}</span> {event.client_name}
          </span>
          <span className="block truncate text-[11px] opacity-80">
            {EVENT_TYPE_LABELS[event.event_type]} · {EVENT_STATUS[event.status].label}
          </span>
        </>
      ) : (
        <>
          <span className="block font-semibold tabular-nums">{formatSchedule(event)}</span>
          <span className="block truncate">{event.client_name}</span>
          <span className="block truncate opacity-80">{EVENT_TYPE_LABELS[event.event_type]}</span>
          <span className="block truncate opacity-80">{EVENT_STATUS[event.status].label}</span>
        </>
      )}
    </button>
  );
}
