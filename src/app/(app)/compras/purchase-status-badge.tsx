import { Tag } from "@/components/ui/tag";
import type { PurchaseStatus } from "@/lib/api/client";
import { PURCHASE_STATUS } from "@/lib/inventory";

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return <Tag {...PURCHASE_STATUS[status]} />;
}
