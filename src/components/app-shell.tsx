"use client";

// Marco de la aplicación: menú lateral + barra superior. Se adapta al tamaño de pantalla:
// - Computadora (lg): menú fijo, que se puede contraer a solo íconos.
// - Tablet (md): menú contraído a íconos.
// - Celular: menú oculto; se abre como panel con el botón ☰.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import type { Permission } from "@/lib/api/client";

import { ROLE_LABELS, useAuth } from "./auth-provider";
import { Icon, type IconName } from "./icons";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

// `permission`: el menú muestra el módulo solo si el rol del usuario lo tiene (HU01).
type MenuItem = { href: string; label: string; icon: IconName; permission?: Permission; anyOf?: Permission[] };

// Solo los módulos que ya existen. Cada módulo nuevo se agrega aquí cuando esté listo.
export const SECTIONS: { title: string; items: MenuItem[] }[] = [
  { title: "General", items: [{ href: "/inicio", label: "Inicio", icon: "dashboard" }] },
  {
    title: "Gestión comercial",
    items: [
      { href: "/clientes", label: "Clientes", icon: "users", permission: "clients:manage" },
      { href: "/cotizaciones", label: "Cotizaciones", icon: "file", permission: "quotes:manage" },
      { href: "/contratos", label: "Contratos", icon: "contract", permission: "contracts:manage" },
      { href: "/catalogo", label: "Catálogo", icon: "catalog", permission: "catalog:read" },
    ],
  },
  {
    title: "Operaciones",
    items: [
      { href: "/eventos", label: "Eventos", icon: "calendar", permission: "events:read" },
      { href: "/almacen", label: "Almacén", icon: "box", permission: "inventory:read" },
      { href: "/personal", label: "Personal", icon: "idCard", permission: "staff:manage" },
    ],
  },
  {
    title: "Compras",
    items: [
      { href: "/compras", label: "Compras", icon: "cart", permission: "purchasing:manage" },
      { href: "/proveedores", label: "Proveedores", icon: "truck", permission: "purchasing:manage" },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { href: "/caja", label: "Caja", icon: "wallet", permission: "payments:record" },
      { href: "/flujo-de-caja", label: "Flujo de caja", icon: "chart", permission: "finance:read" },
      {
        href: "/reportes",
        label: "Reportes",
        icon: "file",
        anyOf: ["events:read", "finance:read", "inventory:read", "purchasing:manage", "staff:manage"],
      },
    ],
  },
  {
    title: "Administración",
    items: [
      { href: "/usuarios", label: "Usuarios", icon: "shield", permission: "users:manage" },
      { href: "/historial", label: "Historial de accesos", icon: "history", permission: "access_log:read" },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, can, logout } = useAuth();
  const sections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => (!item.permission || can(item.permission)) && (!item.anyOf || item.anyOf.some(can))),
  })).filter((section) => section.items.length > 0);
  const [collapsed, setCollapsed] = useState(false); // computadora: menú solo con íconos
  const [mobileOpen, setMobileOpen] = useState(false); // celular: menú abierto

  const nav = (compact: boolean) => (
    <nav className="flex-1 space-y-6 overflow-y-auto p-3">
      {sections.map((section) => (
        <div key={section.title}>
          {!compact && (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </p>
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={compact ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    compact ? "justify-center" : ""
                  } ${active ? "bg-primary text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <Icon name={item.icon} />
                  {!compact && item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Menú lateral: tablet y computadora */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar md:flex print:hidden ${
          collapsed ? "md:w-20" : "md:w-20 lg:w-64"
        }`}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <span className="lg:hidden">
            <Logo withName={false} />
          </span>
          <span className="hidden lg:block">
            <Logo withName={!collapsed} light />
          </span>
        </div>
        <div className="flex flex-1 flex-col lg:hidden">{nav(true)}</div>
        <div className="hidden flex-1 flex-col lg:flex">{nav(collapsed)}</div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          className="m-3 hidden items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:flex"
        >
          <Icon name={collapsed ? "expand" : "collapse"} />
        </button>
      </aside>

      {/* Menú lateral: celular (panel que se abre encima) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/50"
          />
          <aside className="relative flex h-full w-72 flex-col bg-sidebar">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <Logo light />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-2 text-slate-400 hover:text-white"
              >
                <Icon name="close" />
              </button>
            </div>
            {nav(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 print:hidden items-center gap-3 border-b border-line bg-surface px-4 md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="rounded-lg p-2 text-muted hover:bg-surface-muted md:hidden"
          >
            <Icon name="menu" />
          </button>
          <span className="font-medium">Darze Catering</span>
          <ThemeToggle className="ml-auto" />
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-muted">{ROLE_LABELS[user.role]}</div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-danger"
          >
            <Icon name="logout" />
          </button>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}
