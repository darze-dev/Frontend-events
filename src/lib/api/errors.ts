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
};

export function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code, detail } = error as { code: string; detail?: string };
    return MESSAGES[code] ?? detail ?? "No se pudo completar la operación.";
  }
  return "No se pudo conectar con el servidor. ¿Está encendida la API?";
}
