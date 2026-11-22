"use client";

// Pantalla de inicio después de iniciar sesión: saluda y muestra solo los módulos que el rol
// del usuario puede usar (HU01). Los indicadores del panel llegan con HU31.
import Link from "next/link";

import { ROLE_LABELS, useAuth } from "@/components/auth-provider";
import { SECTIONS } from "@/components/app-shell";
import { Icon } from "@/components/icons";

export function HomeScreen() {
  const { user, can } = useAuth();
  const modules = SECTIONS.flatMap((section) => section.items).filter(
    (item) => item.href !== "/inicio" && (!item.permission || can(item.permission)),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Hola, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted">{ROLE_LABELS[user.role]}</p>
      </header>

      {modules.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
          Todavía no hay módulos disponibles para tu rol. Pronto aparecerán aquí.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5 transition hover:border-primary hover:shadow-sm"
            >
              <span className="rounded-lg bg-primary-soft p-3 text-primary">
                <Icon name={item.icon} />
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
