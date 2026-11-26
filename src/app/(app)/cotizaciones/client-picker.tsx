"use client";

// Selector de cliente activo (CA-07.1): se escribe parte del nombre, documento o teléfono y se
// elige de la lista. La búsqueda no distingue tildes (la hace el backend). Si el cliente no existe,
// se registra desde aquí mismo sin salir de la cotización y queda elegido.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ClientForm } from "@/app/(app)/clientes/client-form";
import { useAuth } from "@/components/auth-provider";

import { Icon } from "@/components/icons";
import { fieldClass } from "@/components/ui/styles";
import { api, type Client } from "@/lib/api/client";

export type PickedClient = { id: string; name: string; detail?: string };

type Props = { value: PickedClient | null; onChange: (client: PickedClient | null) => void; disabled?: boolean };

export function ClientPicker({ value, onChange, disabled }: Props) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { can } = useAuth();
  const canCreate = can("clients:manage");

  function pick(client: Client) {
    onChange({
      id: client.id,
      name: client.name,
      detail: `${client.document_type} ${client.document_number} · ${client.phone}`,
    });
    setOpen(false);
  }

  const newClientButton = canCreate && (
    <li className="border-t border-line">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setOpen(false);
          setCreating(true);
        }}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-surface-muted"
      >
        <Icon name="plus" className="size-4" />
        Registrar cliente nuevo{text.trim() ? ` «${text.trim()}»` : ""}
      </button>
    </li>
  );

  const createModal =
    creating &&
    createPortal(
      <ClientForm
        client={null}
        initialText={text}
        onClose={() => setCreating(false)}
        onSaved={(saved) => {
          setCreating(false);
          if (saved) pick(saved);
        }}
      />,
      document.body,
    );

  useEffect(() => {
    if (value || !open) return;
    const timer = setTimeout(() => {
      void api
        .GET("/v1/clients", { params: { query: { text, include_inactive: false } } })
        .then(({ data }) => setResults((data ?? []).slice(0, 8)));
    }, 250);
    return () => clearTimeout(timer);
  }, [text, value, open]);

  if (value) {
    return (
      <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{value.name}</p>
          {value.detail && <p className="text-xs text-muted">{value.detail}</p>}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setText("");
              setOpen(true);
            }}
            className="shrink-0 text-sm text-primary hover:underline"
          >
            Cambiar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 mt-[3px] size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Busca por nombre, DNI/RUC o teléfono"
        aria-label="Buscar cliente"
        className={`${fieldClass} pl-9`}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-lg">
          {results.length === 0 ? (
            <>
              <li className="px-3 py-2.5 text-sm text-muted">Sin resultados. Solo aparecen clientes activos.</li>
              {newClientButton}
            </>
          ) : (
            <>
              {results.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(client)}
                  className="block w-full px-3 py-2 text-left hover:bg-surface-muted"
                >
                  <span className="block text-sm font-medium">{client.name}</span>
                  <span className="block text-xs text-muted">
                    {client.document_type} {client.document_number} · {client.phone}
                  </span>
                </button>
              </li>
            ))}
              {newClientButton}
            </>
          )}
        </ul>
      )}
      {createModal}
    </div>
  );
}
