// Textos de pagos, caja y flujo de caja que comparten las pantallas (HU19–HU22).
// Los montos llegan en céntimos (formatSoles en lib/money); las fechas y horas, en hora de Lima.
import type { MovementCategory, MovementType, PaymentKind } from "@/lib/api/client";

export const PAYMENT_KINDS: Record<PaymentKind, string> = {
  ADVANCE: "Adelanto",
  INSTALLMENT: "Pago parcial",
  REFUND: "Devolución",
};

export const MOVEMENT_TYPES: Record<MovementType, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Egreso",
};

// La categoría debe corresponder al tipo (el backend lo valida: movement.category_invalid).
export const MOVEMENT_CATEGORIES: Record<MovementCategory, { label: string; type: MovementType }> = {
  SUPPLIES: { label: "Insumos", type: "EXPENSE" },
  STAFF: { label: "Personal", type: "EXPENSE" },
  TRANSPORT: { label: "Transporte", type: "EXPENSE" },
  OTHER_EXPENSE: { label: "Otros egresos", type: "EXPENSE" },
  OTHER_INCOME: { label: "Otros ingresos", type: "INCOME" },
};

export function categoriesOf(type: MovementType): MovementCategory[] {
  return (Object.keys(MOVEMENT_CATEGORIES) as MovementCategory[]).filter(
    (category) => MOVEMENT_CATEGORIES[category].type === type,
  );
}

// Egresos por categoría, en el orden del desglose de los reportes (ExpensesOut).
export const EXPENSE_ROWS = [
  { key: "supplies_cents", label: "Insumos" },
  { key: "staff_cents", label: "Personal" },
  { key: "transport_cents", label: "Transporte" },
  { key: "other_cents", label: "Otros egresos" },
] as const;

const dateTime = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

// "2026-11-25T15:04:00Z" → "25 nov. 2026, 10:04" (hora de Lima).
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

const monthName = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" });

// "2026-11" → "Noviembre de 2026" (solo la primera letra en mayúscula)
export function formatMonth(month: string): string {
  const text = monthName.format(new Date(`${month}-01T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
