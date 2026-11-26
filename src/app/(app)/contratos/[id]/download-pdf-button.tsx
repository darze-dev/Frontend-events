"use client";

// Botón "Descargar PDF" (HU43). El backend genera el PDF desde el contrato guardado y lo
// entrega si está pendiente de firma o firmado (R-PDF-2); anulado, el botón explica por qué no.
import { useState } from "react";

import { Icon } from "@/components/icons";
import { secondaryButton } from "@/components/ui/styles";
import { api, type Contract } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

type Props = { contract: Contract; onError: (message: string | null) => void };

export function DownloadPdfButton({ contract, onError }: Props) {
  const [downloading, setDownloading] = useState(false);
  const available = contract.status !== "CANCELLED";

  async function download() {
    setDownloading(true);
    onError(null);
    try {
      const { data, error } = await api.GET("/v1/contracts/{contract_id}/pdf", {
        params: { path: { contract_id: contract.id } },
        parseAs: "blob",
      });
      if (!data) {
        onError(errorMessage(error));
        return;
      }
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${contract.code}.pdf`;
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
      title={available ? "Descargar el contrato en PDF" : "Un contrato anulado no se descarga en PDF."}
      className={secondaryButton}
    >
      <Icon name="download" className="size-4" />
      {downloading ? "Generando…" : "Descargar PDF"}
    </button>
  );
}
