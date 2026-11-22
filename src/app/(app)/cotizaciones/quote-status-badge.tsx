import type { QuoteStatus } from "@/lib/api/client";
import { STATUS_STYLES } from "@/lib/quotes";

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
