// Logo de Darze. Es el ÚNICO lugar que sabe de dónde sale la imagen (public/logo.svg).
// Para cambiar el logo, se reemplaza ese archivo. Si algún día se configura desde la
// pantalla de Configuración, solo cambia este componente.
type Props = {
  size?: number;
  withName?: boolean; // muestra "Darze" y el subtítulo al lado
  subtitle?: string;
  light?: boolean; // texto claro, para fondos oscuros (menú lateral, panel del login)
};

export function Logo({ size = 36, withName = true, subtitle = "Catering", light = false }: Props) {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG local: no necesita optimización */}
      <img src="/logo.svg" alt="Darze" width={size} height={size} className="shrink-0 rounded-lg" />
      {withName && (
        <div className="leading-tight">
          <div className={`font-semibold ${light ? "text-white" : "text-fg"}`}>Darze</div>
          <div className={`text-xs ${light ? "text-slate-400" : "text-muted"}`}>{subtitle}</div>
        </div>
      )}
    </div>
  );
}
