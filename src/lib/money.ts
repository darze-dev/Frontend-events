// Dinero en la pantalla: el usuario escribe soles ("45.50") y la API trabaja en céntimos (4550),
// sin decimales flotantes (AGENTS.md del backend, regla 4).

const soles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

export function formatSoles(cents: number): string {
  return soles.format(cents / 100);
}

// "45" → 4500, "45.5" → 4550, "45,50" → 4550. Devuelve null si no es un monto válido.
export function solesToCents(text: string): number | null {
  const clean = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, decimals = ""] = clean.split(".");
  return Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
}

export function centsToSolesText(cents: number): string {
  return (cents / 100).toFixed(2);
}
