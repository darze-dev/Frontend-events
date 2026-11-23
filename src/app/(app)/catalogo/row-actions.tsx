// Botones "Editar" y "Desactivar/Activar" de una fila o tarjeta del catálogo.
import { Icon } from "@/components/icons";

type Props = { active: boolean; onEdit: () => void; onStatus: () => void };

export function RowActions({ active, onEdit, onStatus }: Props) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-primary hover:bg-primary-soft"
      >
        <Icon name="pencil" className="size-4" />
        Editar
      </button>
      <button
        type="button"
        onClick={onStatus}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-muted ${
          active ? "text-muted hover:text-danger" : "text-success"
        }`}
      >
        <Icon name="power" className="size-4" />
        {active ? "Desactivar" : "Activar"}
      </button>
    </div>
  );
}
