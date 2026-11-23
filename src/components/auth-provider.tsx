"use client";

// Protege las pantallas internas (HU01):
// - sin sesión, manda al inicio de sesión;
// - pide al backend quién es el usuario y qué permisos tiene, para armar el menú;
// - cierra la sesión tras 30 minutos sin actividad en la pantalla.
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, authApi, goToLogin, type Me, type Permission } from "@/lib/api/client";
import { getSession, idleTooLong, markActivity } from "@/lib/auth/session";

type Auth = {
  user: Me;
  can: (permission: Permission) => boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
const CHECK_EVERY_MS = 30 * 1000;

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth solo funciona dentro de <AuthProvider>");
  return auth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);

  const logout = useCallback(async () => {
    const session = getSession();
    if (session) {
      // Si el backend no responde igual se cierra aquí: la sesión vence sola en 30 minutos.
      await authApi
        .POST("/v1/auth/logout", { body: { refresh_token: session.refreshToken } })
        .catch(() => undefined);
    }
    goToLogin(null);
  }, []);

  // Al entrar: ¿hay sesión? ¿quién soy?
  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    if (idleTooLong()) {
      goToLogin("inactividad");
      return;
    }
    markActivity();
    void api.GET("/v1/auth/me").then(({ data }) => {
      if (data) setUser(data);
    });
  }, [router]);

  // Inactividad: cada interacción cuenta como actividad; cada 30 s se revisa el tiempo.
  useEffect(() => {
    let lastWrite = 0;
    const onActivity = () => {
      if (Date.now() - lastWrite > 5000) {
        lastWrite = Date.now();
        markActivity();
      }
    };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    const timer = setInterval(() => {
      if (idleTooLong()) goToLogin("inactividad");
    }, CHECK_EVERY_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
      clearInterval(timer);
    };
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app text-sm text-muted">
        Cargando…
      </div>
    );
  }

  const can = (permission: Permission) => user.permissions.includes(permission);
  return <AuthContext.Provider value={{ user, can, logout }}>{children}</AuthContext.Provider>;
}

export const ROLE_LABELS: Record<Me["role"], string> = {
  ADMIN: "Administrador",
  EVENTS_MANAGER: "Encargado de eventos",
  PURCHASING_MANAGER: "Encargado de compras y almacén",
};
