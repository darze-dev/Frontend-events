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
