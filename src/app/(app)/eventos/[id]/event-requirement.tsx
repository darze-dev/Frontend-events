"use client";

// Requerimiento de insumos del evento (HU25): lo que piden los servicios contratados contra lo que
// salió, está reservado y queda disponible en el almacén. Lo que falta se convierte en una solicitud
// de compra. Con `inventory:manage` se aparta (reserva) stock sin moverlo.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Event } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatQuantityWithUnit, parseQuantity, toMilli } from "@/lib/inventory";

type Requirement = NonNullable<Awaited<ReturnType<typeof fetchRequirement>>["data"]>;
type Line = Requirement["lines"][number];

function fetchRequirement(eventId: string) {
  return api.GET("/v1/inventory/events/{event_id}/requirement", { params: { path: { event_id: eventId } } });
}

export function EventRequirement({ event }: { event: Event }) {
  const { can } = useAuth();
  const canManage = can("inventory:manage");
  const canBuy = can("purchasing:manage");
  const router = useRouter();
  const [data, setData] = useState<Requirement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reserving, setReserving] = useState<Line | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: result, error: apiError } = await fetchRequirement(event.id);
      if (result) setData(result);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setError(errorMessage(null));
    }
  }, [event.id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function release(line: Line) {
    setBusy(true);
    setNotice(null);
    try {
      const { error: apiError } = await api.DELETE("/v1/inventory/events/{event_id}/reservations/{product_id}", {
        params: { path: { event_id: event.id, product_id: line.product_id } },
      });
      if (apiError) setError(errorMessage(apiError));
      else {
        setNotice(`Reserva de ${line.name} quitada.`);
        await load();
      }
    } catch {
      setError(errorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setNotice(null);
    try {
      const { data: purchase, error: apiError } = await api.POST("/v1/purchasing/purchases/from-event/{event_id}", {
        params: { path: { event_id: event.id } },
      });
      if (purchase) router.push(`/compras/${purchase.id}`);
      else setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  const hasShortage = data?.lines.some((l) => toMilli(l.shortage) > 0) ?? false;

  return (
    <section aria-labelledby="req-title" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="req-title" className="font-semibold">Requerimiento</h2>
          <p className="text-sm text-muted">
            {data?.calculated === false
              ? "El evento ya terminó; ver lo que salió abajo."
              : `Lo que piden los servicios para ${data?.guests ?? event.guests} invitados.`}
          </p>
        </div>
        {canBuy && data?.calculated && hasShortage && (
          <button type="button" onClick={() => void generate()} disabled={busy} className={primaryButton}>
            Generar solicitud de compra
          </button>
        )}
      </div>

      {notice && (
        <div role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success">
          {notice}
        </div>
      )}
      {error && <ErrorAlert message={error} />}

      {data?.calculated && (
        <>
          {data.lines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center text-sm text-muted">
              Ningún servicio del evento tiene insumos definidos.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="border-b border-line bg-surface-muted/50 text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Producto</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-medium">Requerido</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-medium">Salido</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-medium">Reservado</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-medium">Disponible</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-medium">Faltante</th>
                    {canManage && (
                      <th scope="col" className="px-4 py-2.5">
                        <span className="sr-only">Acciones</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.lines.map((line) => {
                    const short = toMilli(line.shortage) > 0;
                    const qty = (v: string) => formatQuantityWithUnit(v, line.unit);
                    return (
                      <tr key={line.product_id} className={short ? "bg-danger/10" : ""}>
                        <td className="px-4 py-3 align-top">
                          <span className="font-medium">{line.name}</span>
                          <span className="block text-xs text-muted">{line.code}</span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{qty(line.required)}</td>
                        <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{qty(line.out)}</td>
                        <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{qty(line.reserved)}</td>
                        <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{qty(line.available)}</td>
                        <td className={`whitespace-nowrap px-2 py-3 text-right tabular-nums ${short ? "font-semibold text-danger" : "text-muted"}`}>
                          {qty(line.shortage)}
                        </td>
                        {canManage && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {toMilli(line.available) > 0 && (
                              <button
                                type="button"
                                onClick={() => setReserving(line)}
                                disabled={busy}
                                aria-label={`Reservar ${line.name}`}
                                className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
                              >
                                Reservar
                              </button>
                            )}
                            {toMilli(line.reserved) > 0 && (
                              <button
                                type="button"
                                onClick={() => void release(line)}
                                disabled={busy}
                                aria-label={`Quitar reserva de ${line.name}`}
                                className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-surface-muted hover:text-danger"
                              >
                                Quitar reserva
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {data.without_recipe.length > 0 && (
            <p className="text-sm text-muted">
              Sin insumos definidos: {data.without_recipe.join(", ")}.
            </p>
          )}
        </>
      )}

      {reserving && (
        <ReserveForm
          eventId={event.id}
          line={reserving}
          onClose={() => setReserving(null)}
          onSaved={() => {
            setNotice(`${reserving.name} reservado.`);
            setReserving(null);
            void load();
          }}
        />
      )}
    </section>
  );
}

function ReserveForm({
  eventId,
  line,
  onClose,
  onSaved,
}: {
  eventId: string;
  line: Line;
  onClose: () => void;
  onSaved: () => void;
}) {
  const needed = Math.max(0, toMilli(line.required) - toMilli(line.out) - toMilli(line.reserved));
  const suggested = Math.min(needed, toMilli(line.available));
  const [quantity, setQuantity] = useState(suggested > 0 ? (suggested / 1000).toString() : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseQuantity(quantity);
    if (!parsed || toMilli(parsed) <= 0) return setError("Indica una cantidad mayor que cero, con hasta 3 decimales.");
    if (toMilli(parsed) > toMilli(line.available)) {
      return setError(`Solo hay ${formatQuantityWithUnit(line.available, line.unit)} disponible.`);
    }
    setSaving(true);
    setError(null);
    try {
      const { error: apiError } = await api.POST("/v1/inventory/events/{event_id}/reservations", {
        params: { path: { event_id: eventId } },
        body: { lines: [{ product_id: line.product_id, quantity: parsed }] },
      });
      if (apiError) setError(errorMessage(apiError));
      else onSaved();
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Reservar ${line.name}`} size="sm" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          Disponible: {formatQuantityWithUnit(line.available, line.unit)}. La reserva aparta el stock sin sacarlo del almacén.
        </p>
        {error && <ErrorAlert message={error} />}
        <label className="block text-sm font-medium">
          Cantidad a reservar
          <input
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`${fieldClass} text-right tabular-nums`}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancelar</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? "Reservando…" : "Reservar"}</button>
        </div>
      </form>
    </Modal>
  );
}
