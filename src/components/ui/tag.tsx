// Etiqueta pequeña de color (estado de una compra, tipo de movimiento, alerta de stock…).
export function Tag({ label, className, title }: { label: string; className: string; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
