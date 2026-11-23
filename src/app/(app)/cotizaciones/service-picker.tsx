"use client";

// Ventana para elegir servicios del catálogo. Solo muestra los activos (DOMAIN.md §4, regla 2).
import { useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { fieldClass } from "@/components/ui/styles";
import { api, type Service } from "@/lib/api/client";
import { formatSoles } from "@/lib/money";

type Props = { onPick: (service: Service) => void; onClose: () => void };

export function ServicePicker({ onPick, onClose }: Props) {
  const [text, setText] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void api
        .GET("/v1/catalog/services", { params: { query: { text, include_inactive: false } } })
        .then(({ data }) => setServices(data ?? []));
    }, 250);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <Modal title="Agregar servicios del catálogo" onClose={onClose}>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 mt-[3px] size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Buscar servicio"
          aria-label="Buscar servicio"
          className={`${fieldClass} pl-9`}
        />
      </div>
      <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
        {services.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted">No hay servicios activos con ese nombre.</li>
        ) : (
          services.map((service) => (
            <li key={service.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{service.name}</p>
                <p className="text-xs text-muted">
                  {formatSoles(service.reference_price_cents)}{" "}
                  {service.price_unit === "PER_PERSON" ? "por persona" : "por unidad"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onPick(service);
                  setAdded((list) => [...list, service.id]);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-primary hover:bg-primary-soft"
              >
                <Icon name={added.includes(service.id) ? "check" : "plus"} className="size-4" />
                {added.includes(service.id) ? "Agregado" : "Agregar"}
              </button>
            </li>
          ))
        )}
      </ul>
      <p className="mt-3 text-xs text-muted">Puedes agregar varios. Cierra la ventana cuando termines.</p>
    </Modal>
  );
}
