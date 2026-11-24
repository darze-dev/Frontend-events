// Fechas del calendario (HU12). Se trabaja con "AAAA-MM-DD" y aritmética en UTC, así el
// navegador no corre los días por su zona horaria. "Hoy" es la fecha de Lima.
import { addDays } from "./quotes";

export type CalendarView = "mes" | "semana" | "dia";

export const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "mes", label: "Mes" },
  { value: "semana", label: "Semana" },
  { value: "dia", label: "Día" },
];

export const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

// Lunes de la semana de esa fecha (la semana empieza en lunes).
export function startOfWeek(day: string): string {
  const weekday = (utc(day).getUTCDay() + 6) % 7; // lunes = 0
  return addDays(day, -weekday);
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

function endOfMonth(day: string): string {
  const date = utc(startOfMonth(day));
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return iso(date);
}

// Días que se ven en pantalla: el mes completo en semanas de lunes a domingo, la semana o el día.
export function visibleRange(view: CalendarView, day: string): { from: string; to: string } {
  if (view === "dia") return { from: day, to: day };
  if (view === "semana") {
    const from = startOfWeek(day);
    return { from, to: addDays(from, 6) };
  }
  const from = startOfWeek(startOfMonth(day));
  return { from, to: addDays(startOfWeek(endOfMonth(day)), 6) };
}

export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

// Mismo día del periodo anterior o siguiente.
export function shift(view: CalendarView, day: string, direction: 1 | -1): string {
  if (view === "dia") return addDays(day, direction);
  if (view === "semana") return addDays(day, 7 * direction);
  const date = utc(startOfMonth(day));
  date.setUTCMonth(date.getUTCMonth() + direction);
  return iso(date);
}

const monthTitle = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" });
const dayTitle = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });

export function periodTitle(view: CalendarView, day: string): string {
  if (view === "mes") return capitalize(monthTitle.format(utc(day)));
  if (view === "dia") return capitalize(dayTitle.format(utc(day)));
  const from = startOfWeek(day);
  return `Semana del ${shortDay.format(utc(from))} al ${shortDay.format(utc(addDays(from, 6)))}`;
}

export function dayLabel(day: string): string {
  return capitalize(dayTitle.format(utc(day)).replace(/ de \d{4}$/, ""));
}

export function dayNumber(day: string): number {
  return utc(day).getUTCDate();
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isView(value: string | null): value is CalendarView {
  return value === "mes" || value === "semana" || value === "dia";
}

export function isIsoDate(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(utc(value).getTime());
}
