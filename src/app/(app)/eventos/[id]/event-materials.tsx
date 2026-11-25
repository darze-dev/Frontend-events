"use client";

// Pestaña "Materiales" del evento (CA-26.6): por producto, qué salió, qué volvió, qué se perdió
// y qué reutilizable falta devolver. Con `inventory:manage`: registrar salida o devolución.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { StockMovementForm, type MovementProduct } from "@/components/inventory/stock-movement-form";
import { ErrorAlert } from "@/components/ui/alert";
import { primaryButton } from "@/components/ui/styles";
import { api, type Event, type EventMaterial } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { MOVEMENT_KINDS, PRODUCT_KINDS, formatQuantityWithUnit, toMilli } from "@/lib/inventory";
import { formatDate } from "@/lib/quotes";

type Recording = { kind: "EXIT" | "RETURN"; product: MovementProduct | null };

// Solo salen materiales para un evento programado, confirmado o en ejecución (CA-26.1).
const OPEN_STATUSES: Event["status"][] = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"];

export function EventMaterials({ event }: { event: Event }) {
  const { can } = useAuth();
  const canManage = can("inventory:manage");
  const canExit = canManage && OPEN_STATUSES.includes(event.status);
  const [materials, setMaterials] = useState<EventMaterial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const picked = { id: event.id, label: `${event.code} · ${event.client_name} · ${formatDate(event.event_date)}` };

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET("/v1/inventory/events/{event_id}/materials", {
      params: { path: { event_id: event.id } },
    });
    setMaterials(data ?? []);
    setError(apiError ? errorMessage(apiError) : null);
  }, [event.id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const pendingCount = (materials ?? []).filter((m) => toMilli(m.pending_return) > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? "producto reutilizable falta" : "productos reutilizables faltan"} devolver al almacén.`
            : "Lo que salió del almacén para este evento, lo que volvió y lo que se perdió."}
        </p>
        {canExit && (
          <button type="button" onClick={() => setRecording({ kind: "EXIT", product: null })} className={primaryButton}>
            <Icon name="plus" className="size-4" />
            Registrar salida
          </button>
        )}
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
          <Icon name="check" className="size-4 shrink-0" />
          {notice}
        </div>
      )}
      {error && <ErrorAlert message={error} />}

      {materials === null ? (
        <p className="py-10 text-center text-sm text-muted">Cargando materiales…</p>
      ) : materials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="box" />
          </span>
          <p className="font-medium">Todavía no salieron materiales para este evento</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-line bg-surface-muted/50 text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Producto</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium">Salió</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium">Volvió</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium">Merma</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium">Falta devolver</th>
                {canManage && (
                  <th scope="col" className="px-4 py-2.5">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {materials.map((material) => {
                const pending = toMilli(material.pending_return) > 0;
                const atEvent = toMilli(material.out) - toMilli(material.returned) - toMilli(material.wasted) > 0;
                const product: MovementProduct = { id: material.product_id, name: material.name, unit: material.unit };
                const qty = (value: string) => formatQuantityWithUnit(value, material.unit);
                return (
                  <tr key={material.product_id}>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/almacen/${material.product_id}`} className="font-medium text-primary hover:underline">
                        {material.name}
                      </Link>
                      <span className="block text-xs text-muted">
                        {material.code} · {PRODUCT_KINDS[material.kind].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums">{qty(material.out)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums">{qty(material.returned)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums">{qty(material.wasted)}</td>
                    <td
                      className={`whitespace-nowrap px-2 py-3 text-right align-top font-medium tabular-nums ${
                        pending ? "text-warning" : "text-muted"
                      }`}
                    >
                      {material.kind === "REUSABLE" ? qty(material.pending_return) : "—"}
                    </td>
                    {canManage && (
                      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                        {canExit && (
                          <button
                            type="button"
                            onClick={() => setRecording({ kind: "EXIT", product })}
                            aria-label={`Registrar salida de ${material.name}`}
                            className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
                          >
                            Salida
                          </button>
                        )}
                        {atEvent && (
                          <button
                            type="button"
                            onClick={() => setRecording({ kind: "RETURN", product })}
                            aria-label={`Registrar devolución de ${material.name}`}
                            className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
                          >
                            Devolución
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

      {recording && (
        <StockMovementForm
          kind={recording.kind}
          product={recording.product}
          event={picked}
          lockEvent
          onClose={() => setRecording(null)}
          onSaved={(result, product) => {
            setNotice(
              `${MOVEMENT_KINDS[recording.kind].label} de ${product.name} registrada. Quedan ${formatQuantityWithUnit(result.stock, product.unit)} en el almacén.`,
            );
            setRecording(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
