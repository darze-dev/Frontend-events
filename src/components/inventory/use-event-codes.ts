"use client";

// Código de cada evento que aparece en una lista (los movimientos y compras solo traen el ID).
// Se pide una vez por evento; si no se puede leer, se muestra "Evento".
import { useEffect, useState } from "react";

import { api } from "@/lib/api/client";

export function useEventCodes(ids: (string | null | undefined)[]): Record<string, string> {
  const [codes, setCodes] = useState<Record<string, string>>({});
  const key = [...new Set(ids.filter((id): id is string => !!id))].sort().join(",");

  useEffect(() => {
    const missing = key ? key.split(",").filter((id) => !(id in codes)) : [];
    if (missing.length === 0) return;
    void Promise.all(
      missing.map((id) => api.GET("/v1/events/{event_id}", { params: { path: { event_id: id } } })),
    ).then((responses) => {
      const found: Record<string, string> = {};
      responses.forEach(({ data }, index) => (found[missing[index]] = data?.code ?? "Evento"));
      setCodes((current) => ({ ...current, ...found }));
    });
  }, [key, codes]);

  return codes;
}
