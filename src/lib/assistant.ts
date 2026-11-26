// Textos y ayudas del asistente de consulta (HU35–HU40) que comparten el chat y el historial.

// Nombre de cada función de consulta del backend, en palabras del negocio (transparencia, HU38).
export const TOOL_LABELS: Record<string, string> = {
  upcoming_events: "Próximos eventos",
  event_detail: "Detalle del evento",
  event_account: "Cuenta del evento",
  pending_collections: "Cobros pendientes",
  stock: "Stock de productos",
  stock_alerts: "Alertas de stock",
  event_requirement: "Requerimiento del evento",
  open_purchases: "Compras abiertas",
  cash_flow: "Flujo de caja",
  search_clients: "Búsqueda de clientes",
  client_history: "Historial del cliente",
  search_events: "Búsqueda de eventos",
  search_quotes: "Búsqueda de cotizaciones",
};

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, " ");
}

// Lista sin repetidos ("Consultó: Stock de productos, Alertas de stock").
export function toolSummary(tools: { name: string }[]): string {
  return [...new Set(tools.map((tool) => toolLabel(tool.name)))].join(", ");
}

export const SUGGESTIONS = [
  "¿Qué eventos aún les falta completar pagos?",
  "¿Qué eventos tenemos esta semana?",
  "¿Qué productos están por debajo del stock mínimo?",
  "¿Cómo va el flujo de caja este mes?",
  "¿Qué cotizaciones enviadas siguen sin respuesta?",
];

// Valoración de la respuesta (HU40): textos para el chat y para el historial.
export const FEEDBACK_LABELS = { correct: "Correcta", incorrect: "Incorrecta" } as const;

// El backend acepta preguntas de hasta 1000 caracteres, 10 turnos de historial de hasta 4000.
export const MAX_QUESTION = 1000;
export const MAX_HISTORY_TURNS = 10;
export const MAX_TURN_TEXT = 4000;

// "Mis consultas": página del historial propio.
export const MY_QUERIES_PAGE_SIZE = 10;
