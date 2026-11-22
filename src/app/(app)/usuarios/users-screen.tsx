"use client";

// Gestión de usuarios (HU02): crear, modificar, cambiar rol o contraseña, desactivar y reactivar.
// Solo para el administrador. Desactivar no borra la cuenta ni su historial (RN02).
import { useCallback, useEffect, useState } from "react";

import { ROLE_LABELS, useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { primaryButton } from "@/components/ui/styles";
import { api, type User } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

import { UserForm } from "./user-form";

export function UsersScreen() {
  const { user: me } = useAuth();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await api.GET("/v1/users", {
        params: { query: { include_inactive: includeInactive } },
      });
      setUsers(data ?? []);
      setError(apiError ? errorMessage(apiError) : null);
    } catch {
      setError(errorMessage(null));
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function changeStatus(user: User) {
    const params = { path: { user_id: user.id } };
    const { error: apiError } = user.active
      ? await api.POST("/v1/users/{user_id}/deactivate", { params })
      : await api.POST("/v1/users/{user_id}/activate", { params });
    setDeactivating(null);
    if (apiError) setError(errorMessage(apiError));
    else await load();
  }

  const actions = (user: User) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => setEditing(user)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-primary hover:bg-primary-soft"
      >
        <Icon name="pencil" className="size-4" />
        Editar
      </button>
      {/* No se ofrece desactivar la propia cuenta: cerraría tu sesión sin querer. */}
      {user.id !== me.id && (
        <button
          type="button"
          onClick={() => (user.active ? setDeactivating(user) : void changeStatus(user))}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-muted ${
            user.active ? "text-muted hover:text-danger" : "text-success"
          }`}
        >
          <Icon name="power" className="size-4" />
          {user.active ? "Desactivar" : "Activar"}
        </button>
      )}
    </div>
  );

  const you = (user: User) =>
    user.id === me.id && <span className="ml-2 rounded bg-primary-soft px-1.5 py-0.5 text-xs text-primary">tú</span>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="mt-1 text-sm text-muted">Cuentas del personal de Darze y el rol de cada una.</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className={primaryButton}>
          <Icon name="plus" className="size-4" />
          Nuevo usuario
        </button>
      </header>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(event) => setIncludeInactive(event.target.checked)}
          className="size-4 accent-primary"
        />
        Incluir desactivados
      </label>

      {error && <ErrorAlert message={error} />}

      {loading && users.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Cargando usuarios…</p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3 font-medium">
                      {user.name}
                      {you(user)}
                    </td>
                    <td className="px-4 py-3 text-muted">{user.email}</td>
                    <td className="px-4 py-3 text-muted">{ROLE_LABELS[user.role]}</td>
                    <td className="px-4 py-3">
                      <StatusBadge active={user.active} />
                    </td>
                    <td className="px-4 py-3">{actions(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {users.map((user) => (
              <li key={user.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {user.name}
                      {you(user)}
                    </p>
                    <p className="break-all text-sm text-muted">{user.email}</p>
                    <p className="mt-1 text-sm">{ROLE_LABELS[user.role]}</p>
                  </div>
                  <StatusBadge active={user.active} />
                </div>
                <div className="mt-4 border-t border-line pt-3">{actions(user)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing !== null && (
        <UserForm
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title="Desactivar usuario"
          message={`${deactivating.name} no podrá iniciar sesión y sus sesiones abiertas se cerrarán. Su cuenta y su historial se conservan; puedes reactivarla cuando quieras.`}
          confirmLabel="Desactivar"
          onConfirm={() => changeStatus(deactivating)}
          onClose={() => setDeactivating(null)}
        />
      )}
    </div>
  );
}
