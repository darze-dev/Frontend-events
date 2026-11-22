import type { Metadata } from "next";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión · Darze" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-surface">
      {/* Panel de marca: solo en computadora */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-14 lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-violet/20 blur-3xl"
        />
        <Logo size={44} subtitle="Sistema de gestión de catering" light />
        <div className="relative max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight text-white">
            Gestiona tus eventos
            <br />
            <span className="text-cyan">con inteligencia</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            Clientes, cotizaciones, eventos, personal y pagos en un solo lugar.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">Darze Catering · San Juan de Lurigancho, Lima</p>
      </section>

      {/* Formulario: en todos los tamaños */}
      <section className="relative flex flex-1 items-center justify-center p-6 sm:p-10">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo size={44} subtitle="Sistema de gestión de catering" />
          </div>
          <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-muted">Ingresa tus credenciales para acceder al sistema.</p>
          {/* Suspense: el formulario lee de la URL el motivo por el que se cerró la sesión. */}
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
