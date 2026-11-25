// Traduce los errores de la API a mensajes para el usuario.
// El backend responde con Problem Details: { code, detail, ... }. Se usa `code` porque no cambia.
import { formatQuantity } from "@/lib/inventory";

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
  "quote.pdf_not_available": "El PDF solo se descarga de una cotización enviada o aceptada.",
  "contract.not_found": "No se encontró el contrato.",
  "contract.quote_not_found": "No se encontró la cotización.",
  "contract.quote_not_accepted": "Solo se genera un contrato de una cotización aceptada.",
  "contract.already_exists": "Esta cotización ya tiene un contrato. Para otro, crea una cotización nueva.",
  "contract.advance_invalid": "El adelanto debe ser mayor que cero y no superar el total.",
  "contract.not_pending": "Este contrato ya fue firmado o anulado.",
  "contract.signer_required": "Indica quién firmó el contrato.",
  "contract.signer_too_long": "El nombre del firmante no puede superar 120 caracteres.",
  "contract.signed_on_future": "La fecha de firma no puede ser posterior a hoy.",
  "contract.reason_required": "Para anular el contrato, indica el motivo.",
  "contract.reason_too_long": "El motivo no puede superar 500 caracteres.",
  "contract.refund_invalid": "La devolución debe ser mayor que cero y no superar el adelanto pagado.",
  "contract.already_cancelled": "El contrato ya está anulado.",
  "event.not_found": "No se encontró el evento.",
  "event.activities_closed":
    "Las actividades solo se registran o marcan con el evento programado, confirmado o en ejecución.",
  "event.not_editable":
    "La planificación solo se edita con el evento programado o confirmado.",
  "event.invalid_transition":
    "El evento avanza un estado a la vez y no vuelve atrás. Recarga la página: quizá ya cambió.",
  "event.not_event_day": "El evento solo se pone en ejecución el día del evento.",
  "event.not_cancellable": "Solo se cancela un evento programado o confirmado.",
  "event.date_past": "La fecha del evento debe ser hoy o una fecha futura.",
  "event.time_invalid": "La hora de inicio y la de fin no pueden ser iguales.",
  "event.guests_invalid": "La cantidad de invitados debe estar entre 1 y 10 000.",
  "event.venue_required": "El lugar del evento es obligatorio.",
  "event.venue_too_long": "El lugar no puede superar 300 caracteres.",
  "event.coordinator_invalid":
    "El responsable debe ser un usuario activo: administrador o encargado de eventos.",
  "event.reason_required": "Para cancelar el evento, indica el motivo.",
  "event.reason_too_long": "El motivo no puede superar 500 caracteres.",
  "event.notes_closed": "El evento está cancelado: ya no se agregan ni editan observaciones.",
  "activity.not_found": "No se encontró la actividad.",
  "activity.validation": "La actividad necesita una descripción de hasta 200 caracteres.",
  "activity.responsible_invalid":
    "El responsable debe ser un usuario activo: administrador o encargado de eventos.",
  "activity.already_done": "La actividad ya estaba completada.",
  "activity.already_pending": "La actividad ya estaba pendiente.",
  "note.not_found": "No se encontró la observación.",
  "note.validation": "La observación necesita un texto de hasta 1000 caracteres.",
  "note.not_author": "Solo el autor o un administrador puede editar esta observación.",
  "payment.amount_invalid": "El monto del pago debe ser mayor que cero.",
  "payment.date_in_future": "La fecha del pago no puede ser posterior a hoy.",
  "payment.reference_too_long": "La referencia no puede superar 100 caracteres.",
  "payment.not_found": "No se encontró el pago.",
  "payment.exceeds_balance": "El pago supera el saldo pendiente del contrato.",
  "payment.not_voidable": "Solo se anulan pagos parciales. El adelanto se anula anulando el contrato.",
  "payment.already_voided": "El pago ya está anulado.",
  "payment.reason_required": "Para anular el pago, indica el motivo.",
  "payment.reason_too_long": "El motivo no puede superar 500 caracteres.",
  "contract.not_signed": "Solo se registran pagos en un contrato firmado.",
  "movement.not_found": "No se encontró el movimiento.",
  "movement.already_voided": "El movimiento ya está anulado.",
  "movement.amount_invalid": "El monto debe ser mayor que cero.",
  "movement.category_invalid": "La categoría no corresponde al tipo de movimiento.",
  "movement.concept_required": "Indica el concepto.",
  "movement.concept_too_long": "El concepto no puede superar 200 caracteres.",
  "movement.date_in_future": "La fecha no puede ser posterior a hoy.",
  "movement.reference_too_long": "La referencia no puede superar 100 caracteres.",
  "movement.reason_required": "Para anular el movimiento, indica el motivo.",
  "movement.reason_too_long": "El motivo no puede superar 500 caracteres.",
  "inventory.validation": "Revisa los datos del producto o del movimiento.",
  "inventory.code_taken": "Ya existe un producto con ese código.",
  "inventory.product_not_found": "No se encontró el producto.",
  "inventory.product_inactive": "El producto está desactivado: actívalo para registrar entradas o salidas.",
  "inventory.event_not_found": "No se encontró el evento.",
  "inventory.event_not_assignable": "Solo salen materiales para un evento programado, confirmado o en ejecución.",
  "inventory.insufficient_stock": "No hay stock suficiente para esa cantidad.",
  "inventory.return_exceeds": "No se puede devolver más de lo que salió para el evento y aún no volvió.",
  "inventory.waste_exceeds": "La merma del evento no puede superar lo que salió y no volvió.",
  "purchasing.validation": "Revisa los datos del proveedor o de la compra.",
  "purchasing.document_taken": "Ya existe un proveedor con ese documento.",
  "purchasing.supplier_not_found": "No se encontró el proveedor.",
  "purchasing.supplier_inactive": "El proveedor está desactivado: actívalo o elige otro para ordenar.",
  "purchasing.purchase_not_found": "No se encontró la compra.",
  "purchasing.invalid_transition":
    "La compra ya cambió de estado: una compra recibida o cancelada no se modifica. Recarga la página.",
  "staff.document_duplicated": "Ya existe un trabajador, activo o desactivado, con ese documento.",
  "staff.document_invalid":
    "El documento no es válido: el DNI tiene 8 dígitos y el carné de extranjería, de 9 a 12.",
  "staff.name_required": "El nombre del trabajador es obligatorio.",
  "staff.name_too_long": "El nombre no puede superar 150 caracteres.",
  "staff.phone_invalid": "El teléfono solo admite dígitos.",
  "staff.function_description_required": "Con la función «Otro», describe la función real.",
  "staff.function_description_too_long": "La descripción de la función no puede superar 120 caracteres.",
  "staff.function_description_not_allowed": "Solo la función «Otro» lleva descripción.",
  "staff.rate_invalid": "La tarifa debe ser un monto en soles de cero o más.",
  "staff.overtime_rate_required": "Si aplica hora extra, indica el monto por hora extra.",
  "staff.overtime_rate_invalid": "El monto por hora extra debe ser mayor que cero.",
  "staff.overtime_rate_not_allowed": "Si no aplica hora extra, no corresponde un monto.",
  "staff.audit_reason_not_allowed": "Esta operación no admite motivo.",
  "staff.audit_invalid": "No se pudo registrar la auditoría del cambio.",
  "staff.not_found": "No se encontró el trabajador.",
  "report.range_invalid": "El rango de fechas no es válido: la fecha final no puede ser anterior a la inicial y el rango no supera 366 días.",
  "auth.invalid_credentials": "Correo o contraseña incorrectos, o la cuenta está desactivada.",
  "auth.forbidden": "Tu rol no tiene permiso para esta operación.",
  "auth.session_expired": "Tu sesión terminó. Vuelve a iniciar sesión.",
};

// Códigos cuyo `detail` trae un dato útil (p. ej., el saldo pendiente): se muestra ese texto.
// También los de validación del almacén y las compras, cuyo `detail` dice qué dato corregir.
const DETAIL_FIRST = new Set([
  "payment.exceeds_balance",
  "inventory.validation",
  "inventory.return_exceeds",
  "inventory.waste_exceeds",
  "purchasing.validation",
  // CA-15.3: el detalle identifica el documento repetido ("… con DNI 12345678.").
  "staff.document_duplicated",
]);

// RN20: el backend informa el disponible en `detail` ("… solo hay 3.000 disponible.").
function insufficientStock(detail: string | undefined): string {
  const available = detail?.match(/-?\d+(?:\.\d+)?/)?.[0];
  return available
    ? `No hay stock suficiente: solo hay ${formatQuantity(available)} disponible.`
    : MESSAGES["inventory.insufficient_stock"];
}

export function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code, detail } = error as { code: string; detail?: string };
    if (code === "inventory.insufficient_stock") return insufficientStock(detail);
    if (DETAIL_FIRST.has(code) && detail) return detail;
    return MESSAGES[code] ?? detail ?? "No se pudo completar la operación.";
  }
  return "No se pudo conectar con el servidor. ¿Está encendida la API?";
}
