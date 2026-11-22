"use client";

// Inicio después de iniciar sesión (HU01 y HU31).
// - Administrador: panel de indicadores reales del negocio y accesos rápidos.
// - Demás roles: accesos a sus módulos, como siempre.
import Link from "next/link";

import { ROLE_LABELS, useAuth } from "@/components/auth-provider";
import { SECTIONS } from "@/components/app-shell";
import { Icon } from "@/components/icons";

import { AdminDashboard } from "./admin-dashboard";

export function HomeScreen() {
  const { user, can } = useAuth();
  const modules = SECTIONS.flatMap((section) => section.items).filter(
    (item) => item.href !== "/inicio" && (!item.permission || can(item.permission)),
  );
  const showDashboard = can("dashboard:read");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Hola, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted">{ROLE_LABELS[user.role]}</p>
      </header>

      {showDashboard && <AdminDashboard />}

      {modules.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
          Todavía no hay módulos disponibles para tu rol. Pronto aparecerán aquí.
        </p>
      ) : (
        <section className="space-y-3">
          {showDashboard && <h2 className="font-semibold">Accesos rápidos</h2>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 rounded-xl border border-line bg-surface transition hover:border-primary hover:shadow-sm ${
                  showDashboard ? "p-4" : "p-5"
                }`}
              >
                <span className="rounded-lg bg-primary-soft p-3 text-primary">
                  <Icon name={item.icon} />
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
