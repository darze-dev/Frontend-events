"use client";

// Formulario de inicio de sesión (HU01), conectado a POST /v1/auth/login.
// Si el backend rechaza el acceso, muestra un mensaje que no dice si falló el correo,
// la contraseña o el estado de la cuenta (así lo exige la seguridad del backend).
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Icon } from "@/components/icons";
import { authApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { getSession, markActivity, saveSession } from "@/lib/auth/session";

const field =
  "mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const REASONS: Record<string, string> = {
  inactividad: "Tu sesión se cerró tras 30 minutos sin actividad. Vuelve a ingresar.",
  expirada: "Tu sesión terminó. Vuelve a ingresar.",
};

export function LoginForm() {
  const router = useRouter();
  const notice = REASONS[useSearchParams().get("motivo") ?? ""] ?? null;
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Si ya hay una sesión abierta en esta pestaña, entra directo.
  useEffect(() => {
    if (getSession()) router.replace("/inicio");
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError("Completa el correo y la contraseña.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const { data, error: apiError } = await authApi.POST("/v1/auth/login", {
        body: { email, password },
      });
      if (data) {
        saveSession(data);
        markActivity();
        router.replace("/inicio");
        return;
      }
      setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    }
    setSending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
      {notice && !error && (
        <div role="status" className="flex gap-2 rounded-lg bg-primary-soft p-3 text-sm text-primary">
          <Icon name="lock" className="size-5 shrink-0" />
          {notice}
        </div>
      )}

      <label className="block text-sm font-medium">
        Correo electrónico
        <input name="email" type="email" autoComplete="email" placeholder="nombre@darze.pe" className={field} />
      </label>

      <label className="block text-sm font-medium">
        Contraseña
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            className={`${field} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-2 top-1/2 mt-1 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-fg"
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} className="size-4" />
          </button>
        </span>
      </label>

      {error && (
        <div role="alert" className="flex gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          <Icon name="alert" className="size-5 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-60"
      >
        {sending ? "Ingresando…" : "Iniciar sesión"}
      </button>

      <p className="text-center text-xs text-muted">
        ¿Olvidaste tu contraseña? Pídele al administrador que te asigne una nueva.
      </p>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
        <Icon name="lock" className="size-3.5" />
        Solo personal autorizado de Darze
      </p>
    </form>
  );
}
