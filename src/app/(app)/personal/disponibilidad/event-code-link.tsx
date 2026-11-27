"use client";

// Código del evento en conflicto (EVT-AAAA-NNNN) con enlace al evento. La disponibilidad solo
// trae el código (R-DIS-9), así que el id se busca al hacer clic.
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api/client";

export function EventCodeLink({ code }: { code: string }) {
  const router = useRouter();
  const [missing, setMissing] = useState(false);

  async function open() {
    try {
      const { data } = await api.GET("/v1/events", { params: { query: { text: code, page: 1, page_size: 5 } } });
      const found = data?.items.find((event) => event.code === code);
      if (found) router.push(`/eventos/${found.id}`);
      else setMissing(true);
    } catch {
      setMissing(true);
    }
  }

  return (
    <>
      <button type="button" onClick={() => void open()} className="font-medium text-primary hover:underline">
        {code}
      </button>
      {missing && <span className="ml-1 text-xs text-danger">(no se pudo abrir el evento)</span>}
    </>
  );
}
