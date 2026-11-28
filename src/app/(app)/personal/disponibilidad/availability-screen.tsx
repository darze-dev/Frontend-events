"use client";

// Disponibilidad del personal (HU16, solo administrador): una pestaña para consultar quién está
// libre, ocupado o no disponible en una fecha y horario, y otra para registrar las
// indisponibilidades (vacaciones, permisos, descansos) que alimentan esa consulta.
import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/icons";

import { AvailabilityQuery } from "./availability-query";
import { UnavailabilityList } from "./unavailability-list";

type Tab = "consulta" | "indisponibilidades";

const TABS: { value: Tab; label: string }[] = [
  { value: "consulta", label: "Consultar disponibilidad" },
  { value: "indisponibilidades", label: "Indisponibilidades" },
];

export function AvailabilityScreen() {
  const [tab, setTab] = useState<Tab>("consulta");

  return (
    <div className="space-y-6">
      <header>
        <Link href="/personal" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Personal
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Disponibilidad del personal</h1>
        <p className="mt-1 text-sm text-muted">
          Quién está libre, ocupado en otro evento o avisó que no puede, para decidir a quién asignar.
        </p>
      </header>

      <div role="tablist" aria-label="Secciones" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`panel-${value}`}
            onClick={() => setTab(value)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${
              tab === value ? "border-primary text-primary" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "consulta" ? <AvailabilityQuery /> : <UnavailabilityList />}
      </div>
    </div>
  );
}
