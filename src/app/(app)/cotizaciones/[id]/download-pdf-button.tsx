"use client";

// Botón "Descargar PDF" (HU09). El backend genera el PDF desde la cotización guardada y lo
// entrega solo si está enviada o aceptada (R-PDF-1); en borrador el botón explica qué hacer.
import { useState } from "react";

import { Icon } from "@/components/icons";
import { secondaryButton } from "@/components/ui/styles";
import { api, type Quote } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = { quote: Quote; onError: (message: string | null) => void };

export function DownloadPdfButton({ quote, onError }: Props) {
  const [downloading, setDownloading] = useState(false);
  const available = quote.status === "SENT" || quote.status === "ACCEPTED";
  const reason =
    quote.status === "DRAFT"
      ? "Márcala como enviada para descargar el PDF."
      : "Solo se descarga el PDF de una cotización enviada o aceptada.";

  async function download() {
    setDownloading(true);
    onError(null);
    try {
      const { data, error } = await api.GET("/v1/quotes/{quote_id}/pdf", {
        params: { path: { quote_id: quote.id } },
        parseAs: "blob",
      });
      if (!data) {
        onError(errorMessage(error));
        return;
      }
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${quote.code}.pdf`;
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
      disabled={!available || downloading}
      title={available ? "Descargar la cotización en PDF" : reason}
      className={secondaryButton}
    >
      <Icon name="download" className="size-4" />
      {downloading ? "Generando…" : "Descargar PDF"}
    </button>
  );
}
