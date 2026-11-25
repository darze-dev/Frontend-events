"use client";

// "Descargar comprobante" de un pago (HU20). El backend arma el PDF con el saldo después de ese
// pago; si el pago está anulado, sale con la marca ANULADO y el motivo (CA-20.3).
import { useState } from "react";

import { Icon } from "@/components/icons";
import { api, type AccountPayment } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = { payment: AccountPayment; onError: (message: string | null) => void };

export function ReceiptButton({ payment, onError }: Props) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    onError(null);
    try {
      const { data, error } = await api.GET("/v1/payments/{payment_id}/receipt.pdf", {
        params: { path: { payment_id: payment.id } },
        parseAs: "blob",
      });
      if (!data) {
        onError(errorMessage(error));
        return;
      }
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${payment.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      onError(errorMessage(null));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={downloading}
      aria-label={`Descargar comprobante ${payment.number}`}
      title="Descargar comprobante en PDF"
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft disabled:opacity-60"
    >
      <Icon name="download" className="size-4" />
      {downloading ? "Generando…" : "Comprobante"}
    </button>
  );
}
