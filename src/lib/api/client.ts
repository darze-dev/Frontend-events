// Cliente de la API de Darze. Los tipos salen de openapi.json del backend (npm run api:types),
// así los nombres de campos siempre coinciden con la API.
import createClient from "openapi-fetch";

import type { components, paths } from "./schema";

export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
});

export type Client = components["schemas"]["ClientOut"];
export type ClientCreate = components["schemas"]["ClientCreate"];
export type ClientContactUpdate = components["schemas"]["ClientContactUpdate"];
