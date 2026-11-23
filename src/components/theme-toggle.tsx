"use client";

// Botón claro/oscuro. Guarda la elección en el navegador (localStorage) para la próxima visita.
import { Icon } from "./icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Sin acceso a localStorage (modo privado): el tema dura hasta recargar.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar entre modo claro y oscuro"
      title="Cambiar tema"
      className={`rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-fg ${className}`}
    >
      {/* Se muestran los dos íconos y el CSS deja visible el que corresponde al tema actual. */}
      <Icon name="moon" className="size-5 dark:hidden" />
      <Icon name="sun" className="hidden size-5 dark:block" />
    </button>
  );
}
