// Sesión del usuario en el navegador (HU01).
//
// Se guarda en sessionStorage: dura mientras la pestaña esté abierta y se borra al cerrarla.
// - access token: va en cada petición; dura 15 minutos y se renueva solo antes de vencer.
// - refresh token: sirve para renovarlo; el backend lo invalida tras 30 minutos sin uso.
// Además se anota la última actividad del usuario para cerrar la sesión a los 30 minutos
// sin tocar la pantalla (criterio de HU01).
import type { components } from "@/lib/api/schema";

type TokenOut = components["schemas"]["TokenOut"];

export type Session = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number; // milisegundos (Date.now())
};

export const IDLE_LIMIT_MS = 30 * 60 * 1000;

const SESSION_KEY = "darze.session";
const ACTIVITY_KEY = "darze.lastActivity";

export function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(tokens: TokenOut): Session {
  const session: Session = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessExpiresAt: Date.now() + tokens.expires_in * 1000,
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Sin sessionStorage (modo muy restringido): la sesión dura hasta recargar.
  }
  return session;
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ACTIVITY_KEY);
  } catch {
    // Nada que borrar.
  }
}

export function markActivity(): void {
  try {
    sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  } catch {
    // Sin sessionStorage no se puede medir la inactividad entre recargas.
  }
}

export function idleTooLong(): boolean {
  try {
    const last = Number(sessionStorage.getItem(ACTIVITY_KEY) ?? Date.now());
    return Date.now() - last >= IDLE_LIMIT_MS;
  } catch {
    return false;
  }
}
