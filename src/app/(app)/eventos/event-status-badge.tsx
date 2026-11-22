import type { EventStatus } from "@/lib/api/client";
import { EVENT_STATUS } from "@/lib/events";

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { label, className } = EVENT_STATUS[status];
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
