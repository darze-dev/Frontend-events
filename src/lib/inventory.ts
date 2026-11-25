// Textos y cantidades del almacén y las compras (HU23, HU26–HU29).
// Las cantidades viajan como texto decimal con hasta 3 decimales ("12.500"): se comparan en
// milésimas enteras para no usar decimales flotantes. Los costos van en céntimos (lib/money).
import type {
  ProductCategory,
  ProductKind,
  PurchaseStatus,
  StockMovementKind,
  SupplierDocumentType,
  Unit,
} from "@/lib/api/client";

export const CATEGORIES: Record<ProductCategory, string> = {
  SUPPLIES: "Insumos",
  BEVERAGES: "Bebidas",
  DINNERWARE: "Vajilla",
  GLASSWARE: "Cristalería",
  CUTLERY: "Cubiertos",
  LINENS: "Mantelería",
  FURNITURE: "Mobiliario",
  DISPOSABLES: "Descartables",
  CLEANING: "Limpieza",
  OTHER: "Otros",
};

export const UNITS: Record<Unit, { label: string; plural: string }> = {
  UNIT: { label: "unidad", plural: "unidades" },
  KG: { label: "kg", plural: "kg" },
  G: { label: "g", plural: "g" },
  LITER: { label: "litro", plural: "litros" },
  ML: { label: "ml", plural: "ml" },
  DOZEN: { label: "docena", plural: "docenas" },
  PACKAGE: { label: "paquete", plural: "paquetes" },
  BOX: { label: "caja", plural: "cajas" },
};

export const PRODUCT_KINDS: Record<ProductKind, { label: string; hint: string }> = {
  CONSUMABLE: { label: "Consumible", hint: "Se gasta en el evento (insumos, descartables)." },
  REUSABLE: { label: "Reutilizable", hint: "Sale y vuelve al almacén (vajilla, mantelería)." },
};

export const MOVEMENT_KINDS: Record<StockMovementKind, { label: string; className: string }> = {
  ENTRY: { label: "Entrada", className: "bg-success/10 text-success" },
  EXIT: { label: "Salida", className: "bg-primary-soft text-primary" },
  RETURN: { label: "Devolución", className: "bg-cyan/10 text-cyan" },
  WASTE: { label: "Merma", className: "bg-danger/10 text-danger" },
  ADJUSTMENT: { label: "Ajuste", className: "bg-warning/15 text-warning" },
};

export const PURCHASE_STATUS: Record<PurchaseStatus, { label: string; className: string }> = {
  REQUESTED: { label: "Solicitada", className: "bg-warning/15 text-warning" },
  ORDERED: { label: "Ordenada", className: "bg-primary-soft text-primary" },
  RECEIVED: { label: "Recibida", className: "bg-success/10 text-success" },
  CANCELLED: { label: "Cancelada", className: "bg-danger/10 text-danger" },
};

export const SUPPLIER_DOCUMENTS: Record<SupplierDocumentType, string> = { RUC: "RUC", DNI: "DNI" };

// "12,5" → "12.5". Devuelve null si no es una cantidad sin signo con hasta 3 decimales.
export function parseQuantity(text: string): string | null {
  const clean = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(clean)) return null;
  return clean;
}

// "12.500" → 12500 milésimas. Admite signo ("-2.000" → -2000).
export function toMilli(quantity: string): number {
  const negative = quantity.startsWith("-");
  const [whole, decimals = ""] = quantity.replace(/^[-+]/, "").split(".");
  const value = Number(whole) * 1000 + Number(decimals.padEnd(3, "0").slice(0, 3));
  return negative ? -value : value;
}

const integerPart = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

// "1250.500" → "1,250.5"; "3.000" → "3". Conserva el signo de un ajuste.
export function formatQuantity(quantity: string): string {
  const negative = quantity.startsWith("-");
  const [whole, decimals = ""] = quantity.replace(/^[-+]/, "").split(".");
  const trimmed = decimals.replace(/0+$/, "");
  const text = `${integerPart.format(Number(whole))}${trimmed ? `.${trimmed}` : ""}`;
  return negative && text !== "0" ? `−${text}` : text;
}

// "12.500", "KG" → "12.5 kg"; "1.000", "UNIT" → "1 unidad".
export function formatQuantityWithUnit(quantity: string, unit: Unit | null | undefined): string {
  if (!unit) return formatQuantity(quantity);
  const { label, plural } = UNITS[unit];
  return `${formatQuantity(quantity)} ${toMilli(quantity) === 1000 ? label : plural}`;
}

export function isPositive(quantity: string): boolean {
  return toMilli(quantity) > 0;
}
