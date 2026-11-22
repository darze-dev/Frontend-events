// Estilos comunes de formularios y botones, para que todas las pantallas se vean iguales.
// Usan los colores por función de globals.css: funcionan en modo claro y oscuro.

export const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-surface-muted disabled:text-muted";

export const labelClass = "block text-sm font-medium";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium transition hover:bg-surface-muted disabled:opacity-60";

export const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60";
