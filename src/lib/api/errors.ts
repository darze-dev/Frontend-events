// Traduce los errores de la API a mensajes para el usuario.
// El backend responde con Problem Details: { code, detail, ... }. Se usa `code` porque no cambia.

const MESSAGES: Record<string, string> = {
  "client.document_duplicated": "Ya existe un cliente con ese documento.",
  "client.document_invalid": "El documento no es válido: el DNI tiene 8 dígitos y el RUC 11.",
  "client.name_required": "El nombre es obligatorio.",
  "client.name_too_long": "El nombre no puede superar 150 caracteres.",
  "client.phone_invalid": "El teléfono debe tener entre 7 y 15 dígitos.",
  "client.email_invalid": "El correo no es válido.",
  "client.not_found": "No se encontró el cliente.",
  "catalog.category_name_duplicated": "Ya existe una categoría con ese nombre.",
  "catalog.category_name_required": "El nombre de la categoría es obligatorio.",
  "catalog.category_name_too_long": "El nombre de la categoría no puede superar 60 caracteres.",
  "catalog.category_has_active_services":
    "La categoría tiene servicios activos: desactívalos o muévelos a otra categoría antes.",
  "catalog.category_inactive": "La categoría está desactivada: elige una categoría activa.",
  "catalog.category_not_found": "No se encontró la categoría.",
  "catalog.service_name_required": "El nombre del servicio es obligatorio.",
  "catalog.service_name_too_long": "El nombre del servicio no puede superar 120 caracteres.",
  "catalog.price_invalid": "El precio debe ser un monto de cero o más.",
  "catalog.description_too_long": "La descripción no puede superar 500 caracteres.",
  "catalog.service_not_found": "No se encontró el servicio.",
  "user.email_duplicated": "Ese correo ya está registrado en otra cuenta.",
  "user.email_invalid": "El correo electrónico no es válido.",
  "user.name_required": "El nombre es obligatorio.",
  "user.name_too_long": "El nombre no puede superar 120 caracteres.",
  "user.password_too_short": "La contraseña debe tener al menos 8 caracteres.",
  "user.password_too_long": "La contraseña no puede superar 128 caracteres.",
  "user.last_admin": "Es el único administrador activo: crea o activa otro administrador antes.",
  "user.not_found": "No se encontró el usuario.",
  "quote.not_found": "No se encontró la cotización.",
  "quote.client_not_found": "No se encontró el cliente.",
  "quote.client_inactive": "El cliente está desactivado: elige un cliente activo.",
  "quote.service_not_found": "Uno de los servicios ya no existe en el catálogo.",
  "quote.event_date_past": "La fecha del evento debe ser hoy o una fecha futura.",
  "quote.time_invalid": "La hora de inicio y la de fin no pueden ser iguales.",
  "quote.guests_invalid": "La cantidad de invitados debe estar entre 1 y 10 000.",
  "quote.venue_required": "El lugar del evento es obligatorio.",
  "quote.venue_too_long": "El lugar no puede superar 300 caracteres.",
  "quote.lines_required": "Agrega al menos un servicio o concepto a la cotización.",
  "quote.description_required": "Cada concepto adicional necesita una descripción.",
  "quote.description_too_long": "La descripción no puede superar 200 caracteres.",
  "quote.quantity_invalid": "La cantidad debe ser un número entero mayor que cero.",
  "quote.price_invalid": "Cada línea necesita un precio de cero o más.",
  "quote.valid_until_invalid": "La vigencia debe terminar hoy o en una fecha futura.",
  "quote.notes_too_long": "Las notas no pueden superar 1000 caracteres.",
  "quote.not_editable": "Solo se modifica una cotización en borrador. Si fue enviada, devuélvela a borrador.",
  "quote.invalid_transition": "Ese cambio de estado no está permitido.",
  "quote.expired": "La cotización venció: no cambia de estado. Crea una nueva.",
  "auth.invalid_credentials": "Correo o contraseña incorrectos, o la cuenta está desactivada.",
  "auth.forbidden": "Tu rol no tiene permiso para esta operación.",
  "auth.session_expired": "Tu sesión terminó. Vuelve a iniciar sesión.",
};

export function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code, detail } = error as { code: string; detail?: string };
    return MESSAGES[code] ?? detail ?? "No se pudo completar la operación.";
  }
  return "No se pudo conectar con el servidor. ¿Está encendida la API?";
}
