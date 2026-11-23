"use client";

// Catálogo de servicios (HU06): servicios y categorías en dos pestañas.
// El administrador crea y modifica; los encargados solo consultan (DOMAIN.md §9).
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";

import { CategoriesPanel } from "./categories-panel";
import { ServicesPanel } from "./services-panel";

type Tab = "services" | "categories";

export function CatalogScreen() {
  const { can } = useAuth();
  const canManage = can("catalog:manage");
  const [tab, setTab] = useState<Tab>("services");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Catálogo</h1>
        <p className="mt-1 text-sm text-muted">
          Servicios que ofrece Darze y su precio referencial. La cotización copia el precio: cambiarlo
          aquí no altera cotizaciones ya hechas.
        </p>
      </header>

      <div role="tablist" aria-label="Secciones del catálogo" className="flex gap-1 border-b border-line">
        {(
          [
            ["services", "Servicios"],
            ["categories", "Categorías"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === value ? "border-primary text-primary" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "services" ? (
        <ServicesPanel canManage={canManage} />
      ) : (
        <CategoriesPanel canManage={canManage} />
      )}
    </div>
  );
}
