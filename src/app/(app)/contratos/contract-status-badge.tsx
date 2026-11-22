import type { ContractStatus } from "@/lib/api/client";
import { CONTRACT_STATUS } from "@/lib/contracts";

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const { label, className } = CONTRACT_STATUS[status];
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
