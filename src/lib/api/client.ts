// Cliente de la API de Darze. Los tipos salen de openapi.json del backend (npm run api:types),
// así los nombres de campos siempre coinciden con la API.
//
// - `authApi`: inicio, renovación y cierre de sesión. No lleva token.
// - `api`: todo lo demás. Agrega el token en cada petición, lo renueva antes de que venza y,
//   si el backend responde 401 (sesión vencida), vuelve al inicio de sesión.
import createClient, { type Middleware } from "openapi-fetch";

import { clearSession, getSession, saveSession } from "@/lib/auth/session";

import type { components, paths } from "./schema";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const RENEW_BEFORE_MS = 60 * 1000; // renueva si al token le queda menos de un minuto

export const authApi = createClient<paths>({ baseUrl });
export const api = createClient<paths>({ baseUrl });

let renewing: Promise<string | null> | null = null;

// Devuelve un access token vigente; si está por vencer, lo renueva una sola vez aunque
// varias pantallas lo pidan al mismo tiempo.
async function validAccessToken(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;
  if (session.accessExpiresAt - Date.now() > RENEW_BEFORE_MS) return session.accessToken;
  renewing ??= authApi
    .POST("/v1/auth/refresh", { body: { refresh_token: session.refreshToken } })
    .then(({ data }) => (data ? saveSession(data).accessToken : null))
    .catch(() => null)
    .finally(() => {
      renewing = null;
    });
  return renewing;
}

export function goToLogin(reason: "expirada" | "inactividad" | null = "expirada"): void {
  clearSession();
  window.location.assign(reason ? `/login?motivo=${reason}` : "/login");
}

const withSession: Middleware = {
  async onRequest({ request }) {
    const token = await validAccessToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401) goToLogin("expirada");
    return response;
  },
};

api.use(withSession);

export type Client = components["schemas"]["ClientOut"];
export type ClientCreate = components["schemas"]["ClientCreate"];
export type ClientContactUpdate = components["schemas"]["ClientContactUpdate"];
export type Category = components["schemas"]["CategoryOut"];
export type Service = components["schemas"]["ServiceOut"];
export type PriceUnit = components["schemas"]["PriceUnit"];
export type User = components["schemas"]["UserOut"];
export type AccessLogEntry = components["schemas"]["AccessLogEntryOut"];
export type AccessResult = components["schemas"]["AccessResult"];
export type Quote = components["schemas"]["QuoteOut"];
export type QuoteSummary = components["schemas"]["QuoteSummaryOut"];
export type QuoteIn = components["schemas"]["QuoteIn"];
export type QuoteLineIn = components["schemas"]["QuoteLineIn"];
export type QuoteStatus = components["schemas"]["QuoteStatus"];
export type EventType = components["schemas"]["EventType"];
export type Me = components["schemas"]["MeOut"];
export type Permission = Me["permissions"][number];
export type Role = Me["role"];
