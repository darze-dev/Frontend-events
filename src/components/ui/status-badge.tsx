// Etiqueta "Activo" / "Desactivado" con el mismo aspecto en todas las pantallas.
export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? "bg-success/10 text-success" : "bg-surface-muted text-muted"
      }`}
    >
      <span className={`size-1.5 rounded-full ${active ? "bg-success" : "bg-muted"}`} />
      {active ? "Activo" : "Desactivado"}
    </span>
  );
}
