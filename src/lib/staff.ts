// Textos del personal (HU15) que comparten la lista, el formulario y la ficha.
import type { WorkerDocumentType, WorkerFunction, WorkerSummary, WorkerType } from "@/lib/api/client";

// Lista fija del sistema más "otro", que exige una descripción (CA-15.18, CA-15.25).
export const WORKER_FUNCTIONS: Record<WorkerFunction, string> = {
  COOK: "Cocinero",
  WAITER: "Mozo",
  BARTENDER: "Bartender",
  ASSISTANT: "Ayudante",
  COORDINATOR: "Coordinador",
  OTHER: "Otro",
};

export const WORKER_TYPES: Record<WorkerType, string> = {
  FIXED: "Fijo",
  EVENTUAL: "Eventual",
};

export const WORKER_DOCUMENTS: Record<WorkerDocumentType, string> = {
  DNI: "DNI",
  CE: "Carné de extranjería",
};

export const FUNCTION_DESCRIPTION_MAX = 120;

// La función que se muestra: con "otro", la descripción de la función real.
export function functionLabel(worker: Pick<WorkerSummary, "function" | "function_description">): string {
  if (!worker.function) return "—";
  if (worker.function === "OTHER") return worker.function_description || WORKER_FUNCTIONS.OTHER;
  return WORKER_FUNCTIONS[worker.function];
}

// Igual que el backend (CA-15.19): quita espacios y guiones. "12 345-678" → "12345678".
export function normalizeDocument(text: string): string {
  return text.replace(/[\s-]/g, "");
}

// DNI de 8 dígitos; CE solo dígitos, entre 9 y 12. Devuelve el mensaje si no cumple.
export function documentProblem(type: WorkerDocumentType, number: string): string | null {
  if (type === "DNI" && !/^\d{8}$/.test(number)) return "El DNI debe tener 8 dígitos.";
  if (type === "CE" && !/^\d{9,12}$/.test(number)) return "El carné de extranjería debe tener de 9 a 12 dígitos.";
  return null;
}
