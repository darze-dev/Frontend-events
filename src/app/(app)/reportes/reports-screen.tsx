"use client";

// Reportes (HU32): una pestaña por reporte, según el permiso del rol. Todas usan la misma tabla
// genérica que pinta el `ReportOut` del backend y los mismos botones de descarga CSV y PDF.
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { RequirePermission } from "@/components/require-permission";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type Permission, type ReportOut } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { EVENT_STATUS } from "@/lib/events";
import { MOVEMENT_KINDS, PURCHASE_STATUS, formatQuantity } from "@/lib/inventory";
import { formatSoles } from "@/lib/money";
import { addDays, formatDate, todayInLima } from "@/lib/quotes";
import { WORKER_FUNCTIONS } from "@/lib/staff";

const MAX_DAYS = 366;

type ReportKey = "events" | "cash" | "inventory" | "inventory-movements" | "purchases" | "staff";
type Filters = { from: string; to: string; option: string; flag: boolean };
type Option = { value: string; label: string };

type ReportDef = {
  key: ReportKey;
  label: string;
  permission: Permission;
  hint: string;
  ranged: boolean;
  optionLabel?: string;
  optionParam?: string;
  options?: Option[];
  flagLabel?: string;
  flagParam?: string;
  // Oculto hasta que staff.public_api publique la consulta (hoy el backend responde 503).
  hidden?: boolean;
};

const REPORTS: ReportDef[] = [
  {
    key: "events",
    label: "Eventos",
    permission: "events:read",
    hint: "Eventos del periodo con su estado y su saldo.",
    ranged: true,
    optionLabel: "Estado",
    optionParam: "status",
    options: Object.entries(EVENT_STATUS).map(([value, v]) => ({ value, label: v.label })),
  },
  { key: "cash", label: "Caja", permission: "finance:read", hint: "Pagos, devoluciones, ingresos y egresos del periodo.", ranged: true },
  {
    key: "inventory",
    label: "Almacén",
    permission: "inventory:read",
    hint: "Existencias actuales por producto.",
    ranged: false,
    flagLabel: "Incluir productos desactivados",
    flagParam: "include_inactive",
  },
  {
    key: "inventory-movements",
    label: "Movimientos",
    permission: "inventory:read",
    hint: "Entradas, salidas, devoluciones, mermas y ajustes del almacén.",
    ranged: true,
    optionLabel: "Tipo",
    optionParam: "kind",
    options: Object.entries(MOVEMENT_KINDS).map(([value, v]) => ({ value, label: v.label })),
  },
  {
    key: "purchases",
    label: "Compras",
    permission: "purchasing:manage",
    hint: "Compras del periodo por proveedor y estado.",
    ranged: true,
    optionLabel: "Estado",
    optionParam: "status",
    options: Object.entries(PURCHASE_STATUS).map(([value, v]) => ({ value, label: v.label })),
  },
  {
    key: "staff",
    label: "Personal",
    permission: "staff:manage",
    hint: "Personal registrado y sus tarifas.",
    hidden: true,
    ranged: false,
    optionLabel: "Función",
    optionParam: "function",
    options: Object.entries(WORKER_FUNCTIONS).map(([value, label]) => ({ value, label })),
    flagLabel: "Solo personal activo",
    flagParam: "active",
  },
];

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function presets(today: string): { label: string; from: string; to: string }[] {
  const [year, month] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return [
    { label: "Este mes", from: `${year}-${pad(month)}-01`, to: today },
    { label: "Mes anterior", from: `${prevYear}-${pad(prevMonth)}-01`, to: addDays(`${year}-${pad(month)}-01`, -1) },
    { label: "Este año", from: `${year}-01-01`, to: today },
  ];
}

function buildQuery(def: ReportDef, f: Filters, format?: "csv" | "pdf"): Record<string, string | boolean> {
  const query: Record<string, string | boolean> = {};
  if (def.ranged) {
    query.from = f.from;
    query.to = f.to;
  }
  if (def.optionParam && f.option) query[def.optionParam] = f.option;
  if (def.flagParam && f.flag) query[def.flagParam] = true;
  if (format) query.format = format;
  return query;
}

type RawResult = { data?: unknown; error?: unknown; response: Response };
const rawGet = api.GET as unknown as (path: string, init: unknown) => Promise<RawResult>;

function cell(type: string, value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (type) {
    case "money":
      return formatSoles(Number(value));
    case "date":
      return formatDate(String(value));
    case "quantity":
      return formatQuantity(String(value));
    case "boolean":
      return value ? "Sí" : "No";
    default:
      return String(value);
  }
}

export function ReportsScreen() {
  const { can } = useAuth();
  const available = REPORTS.filter((r) => !r.hidden && can(r.permission));
  const [selected, setSelected] = useState<ReportKey | null>(null);
  const current = available.find((r) => r.key === selected) ?? available[0];

  if (!current) {
    return (
      <RequirePermission permission="finance:read">
        <span />
      </RequirePermission>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="mt-1 text-sm text-muted">Consulta cada reporte en pantalla o descárgalo en CSV o PDF.</p>
      </header>
      <div role="tablist" aria-label="Reportes" className="flex flex-wrap gap-1 border-b border-line">
        {available.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={r.key === current.key}
            onClick={() => setSelected(r.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              r.key === current.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <ReportPanel key={current.key} def={current} />
    </div>
  );
}

function ReportPanel({ def }: { def: ReportDef }) {
  const today = todayInLima();
  const ranges = presets(today);
  const [filters, setFilters] = useState<Filters>({ from: ranges[0].from, to: ranges[0].to, option: "", flag: false });
  const [report, setReport] = useState<ReportOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);

  const rangeError = !def.ranged
    ? null
    : !filters.from || !filters.to
      ? "Elige la fecha inicial y la final."
      : filters.to < filters.from
        ? "La fecha final no puede ser anterior a la inicial."
        : daysBetween(filters.from, filters.to) + 1 > MAX_DAYS
          ? `El rango no puede superar ${MAX_DAYS} días.`
          : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await rawGet(`/v1/reports/${def.key}`, {
        params: { query: buildQuery(def, filters) },
      });
      setReport((data as ReportOut | undefined) ?? null);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setReport(null);
      setError(errorMessage(null));
    }
    setLoading(false);
  }, [def, filters]);

  useEffect(() => {
    if (rangeError) return;
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load, rangeError]);

  async function download(format: "csv" | "pdf") {
    setDownloading(format);
    setError(null);
    try {
      const { data, error: apiError, response } = await rawGet(`/v1/reports/${def.key}`, {
        params: { query: buildQuery(def, filters, format) },
        parseAs: "blob",
      });
      if (!(data instanceof Blob)) {
        setError(errorMessage(apiError));
        return;
      }
      const fromHeader = response.headers.get("content-disposition")?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1];
      const fallback = `reporte-${def.key}${def.ranged ? `-${filters.from}_${filters.to}` : `-${today}`}.${format}`;
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fromHeader ? decodeURIComponent(fromHeader) : fallback;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(errorMessage(null));
    } finally {
      setDownloading(null);
    }
  }

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <section className="space-y-4" role="tabpanel">
      <p className="text-sm text-muted">{def.hint}</p>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
        {def.ranged && (
          <>
            <label className={`${labelClass} w-40`}>
              Desde
              <input type="date" value={filters.from} max={today} onChange={(e) => set({ from: e.target.value })} className={fieldClass} />
            </label>
            <label className={`${labelClass} w-40`}>
              Hasta
              <input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className={fieldClass} />
            </label>
            <div className="flex flex-wrap gap-2">
              {ranges.map((r) => (
                <button key={r.label} type="button" onClick={() => set({ from: r.from, to: r.to })} className={secondaryButton}>
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}
        {def.options && (
          <label className={`${labelClass} w-48`}>
            {def.optionLabel}
            <select value={filters.option} onChange={(e) => set({ option: e.target.value })} className={fieldClass}>
              <option value="">Todos</option>
              {def.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {def.flagLabel && (
          <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
            <input type="checkbox" checked={filters.flag} onChange={(e) => set({ flag: e.target.checked })} />
            {def.flagLabel}
          </label>
        )}
        <div className="ml-auto flex gap-2">
          {(["csv", "pdf"] as const).map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => void download(format)}
              disabled={downloading !== null || rangeError !== null}
              className={secondaryButton}
            >
              <Icon name="download" className="size-4" />
              {downloading === format ? "Generando…" : `Descargar ${format.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>

      {rangeError && <ErrorAlert message={rangeError} />}
      {error && <ErrorAlert message={error} />}
      {!rangeError && loading && !report && <p className="py-6 text-sm text-muted">Generando reporte…</p>}
      {!rangeError && report && <ReportTable report={report} />}
    </section>
  );
}

function ReportTable({ report }: { report: ReportOut }) {
  const numeric = new Set(["money", "quantity", "integer"]);
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-semibold">{report.title}</h2>
        <p className="text-xs text-muted">
          {report.filters.map((f) => `${f.label}: ${f.value}`).join(" · ")}
          {report.filters.length > 0 && " · "}
          {report.rows.length} {report.rows.length === 1 ? "fila" : "filas"}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-xs text-muted">
            <tr>
              {report.columns.map((c) => (
                <th key={c.key} scope="col" className={`px-3 py-2 font-medium ${numeric.has(c.type) ? "text-right" : ""}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(report.columns.length, 1)} className="px-3 py-8 text-center text-muted">
                  No hay datos para estos filtros.
                </td>
              </tr>
            ) : (
              report.rows.map((row, i) => (
                <tr key={i}>
                  {report.columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${numeric.has(c.type) ? "text-right tabular-nums" : ""}`}>
                      {cell(c.type, row[c.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {report.totals.length > 0 && (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {report.totals.map((t) => (
            <div key={t.key} className="rounded-xl border border-line bg-surface p-3">
              <dt className="text-xs text-muted">{t.label}</dt>
              <dd className="mt-1 font-semibold tabular-nums">{cell(t.type, t.value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {report.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
          {report.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
