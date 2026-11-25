"use client";

// Caja (HU21): ingresos y egresos que no son pagos de un cliente, del más reciente al más antiguo.
// Filtros por fechas, tipo, categoría, evento y estado (CA-21.4). "Nuevo ingreso / egreso" con
// evento opcional; "Anular" con motivo (CA-21.3). Lo anulado queda a la vista, marcado.
// `?evento=<id>` abre la caja filtrada por ese evento (enlace desde el resultado del evento).
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { VoidForm } from "@/components/finance/void-form";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import {
  api,
  type Movement,
  type MovementCategory,
  type MovementState,
  type MovementType,
} from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { PAYMENT_METHODS } from "@/lib/contracts";
import { MOVEMENT_CATEGORIES, MOVEMENT_TYPES, categoriesOf, formatDateTime } from "@/lib/finance";
import { formatSoles } from "@/lib/money";
import { formatDate } from "@/lib/quotes";

import { EventPicker, eventLabel, type PickedEvent } from "./event-picker";
import { MovementForm } from "./movement-form";

const PAGE_SIZE = 20;

export function CashScreen() {
  const eventParam = useSearchParams().get("evento");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [type, setType] = useState<MovementType | "">("");
  const [category, setCategory] = useState<MovementCategory | "">("");
  const [state, setState] = useState<MovementState | "">("");
  const [eventFilter, setEventFilter] = useState<PickedEvent | null>(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState<MovementType | null>(null);
  const [voiding, setVoiding] = useState<Movement | null>(null);
  // Código de cada evento que aparece en la lista (el movimiento solo trae el ID).
  const [eventLabels, setEventLabels] = useState<Record<string, string>>({});

  // Filtro inicial por el evento del enlace.
  useEffect(() => {
    if (!eventParam) return;
    void api.GET("/v1/events/{event_id}", { params: { path: { event_id: eventParam } } }).then(({ data }) => {
      if (data) setEventFilter({ id: data.id, label: eventLabel(data) });
    });
  }, [eventParam]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await api.GET("/v1/movements", {
      params: {
        query: {
          date_from: dateFrom || null,
          date_to: dateTo || null,
          type: type || null,
          category: category || null,
          event_id: eventFilter?.id ?? null,
          state: state || null,
          page,
          page_size: PAGE_SIZE,
        },
      },
    });
    setItems(data?.items ?? []);
    setTotal(data?.total ?? 0);
    setError(apiError ? errorMessage(apiError) : null);
    setLoading(false);
  }, [dateFrom, dateTo, type, category, eventFilter, state, page]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const missing = [...new Set(items.map((m) => m.event_id).filter((id): id is string => !!id))].filter(
      (id) => !(id in eventLabels),
    );
    if (missing.length === 0) return;
    void Promise.all(
      missing.map((id) => api.GET("/v1/events/{event_id}", { params: { path: { event_id: id } } })),
    ).then((responses) => {
      const found: Record<string, string> = {};
      responses.forEach(({ data }, index) => (found[missing[index]] = data?.code ?? "Evento"));
      setEventLabels((current) => ({ ...current, ...found }));
    });
  }, [items, eventLabels]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(dateFrom || dateTo || type || category || state || eventFilter);
  const change = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };
  const categoryOptions = type ? categoriesOf(type) : (Object.keys(MOVEMENT_CATEGORIES) as MovementCategory[]);

  async function voidMovement(movement: Movement, reason: string): Promise<string | null> {
    const { data, error: apiError } = await api.POST("/v1/movements/{movement_id}/void", {
      params: { path: { movement_id: movement.id } },
      body: { reason },
    });
    if (!data) return errorMessage(apiError);
    setVoiding(null);
    setNotice(`${MOVEMENT_TYPES[movement.type]} “${movement.concept}” anulado.`);
    void load();
    return null;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Caja</h1>
          <p className="mt-1 text-sm text-muted">
            Ingresos y egresos del negocio. Los pagos de los clientes se registran en su contrato.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCreating("INCOME")} className={secondaryButton}>
            <Icon name="plus" className="size-4" />
            Nuevo ingreso
          </button>
          <button type="button" onClick={() => setCreating("EXPENSE")} className={primaryButton}>
            <Icon name="plus" className="size-4" />
            Nuevo egreso
          </button>
        </div>
      </header>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>
          Desde
          <input type="date" value={dateFrom} onChange={(e) => change(setDateFrom)(e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Hasta
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => change(setDateTo)(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Tipo
          <select
            value={type}
            onChange={(e) => {
              const next = e.target.value as MovementType | "";
              setType(next);
              if (next && category && MOVEMENT_CATEGORIES[category].type !== next) setCategory("");
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {(Object.keys(MOVEMENT_TYPES) as MovementType[]).map((value) => (
              <option key={value} value={value}>
                {MOVEMENT_TYPES[value]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Categoría
          <select
            value={category}
            onChange={(e) => change((v) => setCategory(v as MovementCategory | ""))(e.target.value)}
            className={fieldClass}
          >
            <option value="">Todas</option>
            {categoryOptions.map((value) => (
              <option key={value} value={value}>
                {MOVEMENT_CATEGORIES[value].label}
              </option>
            ))}
          </select>
        </label>
        <div className={labelClass}>
          <span aria-hidden="true">Evento</span>
          <EventPicker
            value={eventFilter}
            onChange={(picked) => {
              setEventFilter(picked);
              setPage(1);
            }}
            label="Filtrar por evento"
          />
        </div>
        <label className={labelClass}>
          Estado
          <select
            value={state}
            onChange={(e) => change((v) => setState(v as MovementState | ""))(e.target.value)}
            className={fieldClass}
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Vigentes</option>
            <option value="VOIDED">Anulados</option>
          </select>
        </label>
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
          <Icon name="check" className="size-4 shrink-0" />
          {notice}
        </div>
      )}
      {error && <ErrorAlert message={error} />}

      {loading && items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando movimientos…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-medium">{filtered ? "Ningún movimiento coincide" : "Todavía no hay movimientos"}</p>
          <p className="mt-1 text-sm text-muted">Registra un egreso (insumos, personal, transporte…) o un ingreso.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-line bg-surface-muted/50 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Fecha</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Concepto</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Medio</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-medium">Monto</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Registró</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((movement) => {
                  const income = movement.type === "INCOME";
                  return (
                    <tr key={movement.id} className={movement.void ? "text-muted" : ""}>
                      <td className="px-4 py-3 align-top whitespace-nowrap">{formatDate(movement.occurred_on)}</td>
                      <td className="px-2 py-3 align-top">
                        <span className="block font-medium">{movement.concept}</span>
                        <span className="block text-xs text-muted">
                          {MOVEMENT_TYPES[movement.type]} · {MOVEMENT_CATEGORIES[movement.category].label}
                          {movement.event_id && (
                            <>
                              {" · "}
                              <Link href={`/eventos/${movement.event_id}`} className="text-primary hover:underline">
                                {eventLabels[movement.event_id] ?? "Evento"}
                              </Link>
                            </>
                          )}
                        </span>
                        {movement.void && (
                          <span className="mt-1 block text-xs text-danger">
                            Anulado: {movement.void.reason}
                            <span className="block text-muted">
                              {movement.void.voided_by_name} · {formatDateTime(movement.void.voided_at)}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 align-top">
                        {PAYMENT_METHODS[movement.method]}
                        {movement.reference && <span className="block text-xs text-muted">{movement.reference}</span>}
                      </td>
                      <td
                        className={`px-2 py-3 text-right align-top font-medium tabular-nums whitespace-nowrap ${
                          movement.void ? "line-through" : income ? "text-success" : "text-danger"
                        }`}
                      >
                        {income ? "+ " : "− "}
                        {formatSoles(movement.amount_cents)}
                      </td>
                      <td className="px-2 py-3 align-top">
                        {movement.recorded_by_name}
                        <span className="block text-xs text-muted">{formatDateTime(movement.recorded_at)}</span>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        {!movement.void && (
                          <button
                            type="button"
                            onClick={() => setVoiding(movement)}
                            aria-label={`Anular ${MOVEMENT_TYPES[movement.type].toLowerCase()} ${movement.concept}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-danger/10 hover:text-danger"
                          >
                            <Icon name="close" className="size-4" />
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav aria-label="Páginas" className="flex items-center justify-between text-sm">
            <p className="text-muted">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Página anterior" className={secondaryButton}>
                <Icon name="chevronLeft" className="size-4" />
              </button>
              <span className="tabular-nums">
                {page} / {pages}
              </span>
              <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Página siguiente" className={secondaryButton}>
                <Icon name="chevronRight" className="size-4" />
              </button>
            </div>
          </nav>
        </>
      )}

      {creating && (
        <MovementForm
          type={creating}
          initialEvent={eventFilter}
          onClose={() => setCreating(null)}
          onSaved={(movement) => {
            setCreating(null);
            setNotice(`${MOVEMENT_TYPES[movement.type]} “${movement.concept}” registrado por ${formatSoles(movement.amount_cents)}.`);
            if (page === 1) void load();
            else setPage(1);
          }}
        />
      )}
      {voiding && (
        <VoidForm
          title={`Anular ${MOVEMENT_TYPES[voiding.type].toLowerCase()}`}
          summary={`“${voiding.concept}” de ${formatSoles(voiding.amount_cents)} del ${formatDate(voiding.occurred_on)}.`}
          confirmLabel="Anular movimiento"
          onSubmit={(reason) => voidMovement(voiding, reason)}
          onClose={() => setVoiding(null)}
        />
      )}
    </div>
  );
}
