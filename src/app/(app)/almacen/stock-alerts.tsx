// Alertas de un producto (CA-23.5): stock en el mínimo o debajo, y alguna entrada con stock
// que vence en 15 días o menos (o ya venció).
import { Tag } from "@/components/ui/tag";
import type { Product } from "@/lib/api/client";
import { formatQuantityWithUnit } from "@/lib/inventory";
import { formatDate, todayInLima } from "@/lib/quotes";

export function StockAlerts({ product }: { product: Product }) {
  if (!product.is_low_stock && !product.expiring_soon) return null;
  const expired = product.next_expiry !== null && product.next_expiry < todayInLima();
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {product.is_low_stock && (
        <Tag
          label="Stock bajo"
          className="bg-danger/10 text-danger"
          title={`Mínimo: ${formatQuantityWithUnit(product.min_stock, product.unit)}`}
        />
      )}
      {product.expiring_soon && (
        <Tag
          label="Por vencer"
          className="bg-warning/15 text-warning"
          title={product.next_expiry ? `${expired ? "Venció" : "Vence"} el ${formatDate(product.next_expiry)}` : undefined}
        />
      )}
    </span>
  );
}
