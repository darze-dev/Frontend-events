"use client";

// Lista de contratos (HU41–HU42): buscar por código o cliente y filtrar por estado.
// Los contratos se generan desde una cotización aceptada.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { fieldClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { api, type ContractStatus, type ContractSummary } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { CONTRACT_STATUS } from "@/lib/contracts";
import { formatSoles } from "@/lib/money";
import { formatDate } from "@/lib/quotes";

import { ContractStatusBadge } from "./contract-status-badge";

const PAGE_SIZE = 20;

export function ContractsScreen() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<ContractStatus | "">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ContractSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await api.GET("/v1/contracts", {
      params: { query: { text, status: status || null, page, page_size: PAGE_SIZE } },
    });
    setItems(data?.items ?? []);
    setTotal(data?.total ?? 0);
    setError(apiError ? errorMessage(apiError) : null);
    setLoading(false);
  }, [text, status, page]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Contratos</h1>
        <p className="mt-1 text-sm text-muted">
          Formalizan una cotización aceptada. Se generan desde el detalle de la cotización.
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2">
        <label className={labelClass}>
          Buscar
          <input
            type="search"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPage(1);
            }}
            placeholder="Código o cliente"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Estado
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ContractStatus | "");
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {(Object.keys(CONTRACT_STATUS) as ContractStatus[]).map((value) => (
              <option key={value} value={value}>
                {CONTRACT_STATUS[value].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <ErrorAlert message={error} />}

      {loading && items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando contratos…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
            <Icon name="contract" />
          </span>
          <p className="font-medium">{text || status ? "Ningún contrato coincide" : "Todavía no hay contratos"}</p>
          <p className="mt-1 text-sm text-muted">
            Abre una cotización aceptada y usa “Generar contrato”.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {items.map((contract) => (
              <li key={contract.id}>
                <Link
                  href={`/contratos/${contract.id}`}
                  className="flex flex-col gap-2 px-4 py-3 hover:bg-surface-muted/50 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-primary">{contract.code}</span>
                    <span className="block truncate text-sm text-muted">
                      {contract.client_name} · evento el {formatDate(contract.event_date)}
                    </span>
                  </span>
                  <span className="text-sm tabular-nums sm:w-56 sm:text-right">
                    <span className="block font-medium">{formatSoles(contract.total_cents)}</span>
                    <span className="block text-xs text-muted">adelanto {formatSoles(contract.advance_cents)}</span>
                  </span>
                  <ContractStatusBadge status={contract.status} />
                </Link>
              </li>
            ))}
          </ul>
          <nav aria-label="Páginas" className="flex items-center justify-between text-sm">
            <p className="text-muted">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Página anterior" className={secondaryButton}>
                <Icon name="chevronLeft" className="size-4" />
              </button>
              <span className="tabular-nums">{page} / {pages}</span>
              <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Página siguiente" className={secondaryButton}>
                <Icon name="chevronRight" className="size-4" />
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
