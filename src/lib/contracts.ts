// Textos de contratos que comparte la pantalla (HU41–HU42).
import type { ContractStatus, PaymentMethod } from "@/lib/api/client";

export const CONTRACT_STATUS: Record<ContractStatus, { label: string; className: string }> = {
  PENDING_SIGNATURE: { label: "Pendiente de firma", className: "bg-warning/15 text-warning" },
  SIGNED: { label: "Firmado", className: "bg-success/10 text-success" },
  CANCELLED: { label: "Anulado", className: "bg-danger/10 text-danger" },
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  YAPE_PLIN: "Yape / Plin",
};

// 50 % del total, redondeado al céntimo (igual que el backend).
export function defaultAdvance(totalCents: number): number {
  return Math.floor((totalCents * 50 + 50) / 100);
}
