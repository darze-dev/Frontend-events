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
export type ClientHistory = components["schemas"]["ClientHistoryOut"];
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
export type Dashboard = components["schemas"]["DashboardOut"];
export type ReportOut = components["schemas"]["ReportOut"];
export type DashboardQuote = components["schemas"]["DashboardQuoteOut"];
export type Contract = components["schemas"]["ContractOut"];
export type ContractSummary = components["schemas"]["ContractSummaryOut"];
export type ContractStatus = components["schemas"]["ContractStatus"];
export type PaymentMethod = components["schemas"]["PaymentMethod"];
export type ContractAccount = components["schemas"]["ContractAccountOut"];
export type AccountPayment = components["schemas"]["AccountPaymentOut"];
export type PaymentKind = components["schemas"]["PaymentKind"];
export type Movement = components["schemas"]["local_eventos__modules__ledger__presentation__movement_schemas__MovementOut"];
export type MovementIn = components["schemas"]["MovementIn"];
export type MovementType = components["schemas"]["MovementType"];
export type MovementCategory = components["schemas"]["MovementCategory"];
export type MovementState = components["schemas"]["MovementState"];
export type CashFlow = components["schemas"]["CashFlowOut"];
export type CashSummary = components["schemas"]["CashSummaryOut"];
export type Expenses = components["schemas"]["ExpensesOut"];
export type EventResult = components["schemas"]["EventResultOut"];
export type Event = components["schemas"]["EventOut"];
export type EventSummary = components["schemas"]["EventSummaryOut"];
export type EventStatus = components["schemas"]["EventStatus"];
export type Coordinator = components["schemas"]["CoordinatorOut"];
// Planificación y estados del evento (HU11).
export type EventPlanningIn = components["schemas"]["EventPlanningIn"];
export type EventPlanning = components["schemas"]["EventPlanningOut"];
export type EventChange = components["schemas"]["EventChangeOut"];
export type EventAction = components["schemas"]["EventAction"];
export type FieldChange = components["schemas"]["FieldChangeOut"];
export type Activity = components["schemas"]["ActivityOut"];
export type Note = components["schemas"]["NoteOut"];
export type Me = components["schemas"]["MeOut"];
export type Permission = Me["permissions"][number];
export type Role = Me["role"];
// Almacén (HU23, HU26) y compras (HU27–HU29). Las cantidades llegan como texto decimal
// ("12.500") y los costos en céntimos.
export type Product = components["schemas"]["ProductOut"];
export type ProductIn = components["schemas"]["ProductIn"];
export type ProductCategory = components["schemas"]["Category"];
export type ProductKind = components["schemas"]["ProductKind"];
export type Unit = components["schemas"]["Unit"];
export type StockMovement = components["schemas"]["local_eventos__modules__inventory__presentation__schemas__MovementOut"];
export type StockMovementKind = components["schemas"]["MovementKind"];
export type RecordedMovement = components["schemas"]["RecordedMovementOut"];
export type EventMaterial = components["schemas"]["EventMaterialOut"];
export type Supplier = components["schemas"]["SupplierOut"];
export type SupplierIn = components["schemas"]["SupplierIn"];
export type SupplierDocumentType = components["schemas"]["local_eventos__modules__purchasing__domain__supplier__DocumentType"];
export type Purchase = components["schemas"]["PurchaseOut"];
export type PurchaseLine = components["schemas"]["PurchaseLineOut"];
export type PurchaseStatus = components["schemas"]["PurchaseStatus"];
export type Shortage = components["schemas"]["ShortageOut"];
// Ficha consolidada del evento (HU14): una sola respuesta por bloques.
export type EventSheet = components["schemas"]["EventSheetOut"];
export type SheetStaff = components["schemas"]["SheetStaffOut"];
export type SheetActivity = components["schemas"]["SheetActivityOut"];
// Personal (HU15): trabajadores con baja lógica. Tarifas en céntimos de sol.
export type Worker = components["schemas"]["WorkerOut"];
export type WorkerSummary = components["schemas"]["WorkerSummaryOut"];
export type WorkerCreate = components["schemas"]["WorkerCreate"];
export type WorkerFunction = components["schemas"]["WorkerFunction"];
export type WorkerType = components["schemas"]["WorkerType"];
export type WorkerDocumentType = components["schemas"]["WorkerDocumentType"];
export type WorkerStatus = components["schemas"]["WorkerStatus"];
// Asignaciones de personal a un evento (HU17): horario local de Lima y pago acordado en céntimos.
export type Assignment = components["schemas"]["AssignmentOut"];
export type AssignmentConflict = components["schemas"]["AssignmentConflictOut"];
// Disponibilidad del personal (HU16): estado por trabajador e indisponibilidades planificadas.
export type Availability = components["schemas"]["AvailabilityOut"];
export type AvailabilityItem = components["schemas"]["AvailabilityItem"];
export type AvailabilityState = components["schemas"]["AvailabilityState"];
export type AvailabilityConflict = components["schemas"]["AvailabilityConflict"];
export type Unavailability = components["schemas"]["UnavailabilityOut"];
export type UnavailabilityDetail = components["schemas"]["UnavailabilityDetail"];
export type UnavailabilityKind = components["schemas"]["UnavailabilityKind"];
export type UnavailabilityStatus = components["schemas"]["UnavailabilityStatus"];
// Asistente de consulta con IA (HU35–HU40).
export type AssistantAnswer = components["schemas"]["AskOut"];
export type AssistantToolUse = components["schemas"]["ToolUseOut"];
export type AssistantLogEntry = components["schemas"]["QueryLogEntryOut"];
// Valoración de una respuesta (correcta/incorrecta) e historial propio (HU40).
export type AssistantFeedback = components["schemas"]["FeedbackOut"];
export type AssistantFeedbackValue = AssistantFeedback["value"];
export type MyQuery = components["schemas"]["MyQueryOut"];
