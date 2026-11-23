"use client";

// Formulario para crear o modificar un usuario (HU02), en una ventana.
// La contraseña nunca se muestra: al editar, solo se escribe si se quiere asignar una nueva.
import { useState, type FormEvent } from "react";

import { ROLE_LABELS } from "@/components/auth-provider";
import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api, type Role, type User } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

const ROLE_HINTS: Record<Role, string> = {
  ADMIN: "Todo el sistema, incluidos usuarios e historial de accesos",
  EVENTS_MANAGER: "Clientes, cotizaciones y eventos; consulta el catálogo",
  PURCHASING_MANAGER: "Compras y almacén; consulta el catálogo",
};

const ROLES: Role[] = ["ADMIN", "EVENTS_MANAGER", "PURCHASING_MANAGER"];

type Props = {
  user: User | null; // null = usuario nuevo
  onSaved: () => void;
  onClose: () => void;
};

export function UserForm({ user, onSaved, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = user === null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const role = (ROLES.find((r) => r === text("role")) ?? "EVENTS_MANAGER") as Role;
    const password = String(form.get("password") ?? "");
    if (password && password !== String(form.get("password_repeat") ?? "")) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: apiError } = isNew
        ? await api.POST("/v1/users", {
            body: { name: text("name"), email: text("email"), password, role, active: form.get("active") === "on" },
          })
        : await api.PUT("/v1/users/{user_id}", {
            params: { path: { user_id: user.id } },
            body: { name: text("name"), email: text("email"), role, new_password: password || null },
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
    <Modal title={isNew ? "Nuevo usuario" : "Editar usuario"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className={labelClass}>
          Nombre completo <span className="text-danger">*</span>
          <input name="name" required autoFocus defaultValue={user?.name} className={fieldClass} />
        </label>

        <label className={labelClass}>
          Correo electrónico <span className="text-danger">*</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            defaultValue={user?.email}
            className={fieldClass}
          />
          <span className="mt-1 block text-xs font-normal text-muted">Es el usuario para iniciar sesión.</span>
        </label>

        <fieldset>
          <legend className="text-sm font-medium">
            Rol <span className="text-danger">*</span>
          </legend>
          <div className="mt-1.5 space-y-2">
            {ROLES.map((role) => (
              <label
                key={role}
                className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  defaultChecked={(user?.role ?? "EVENTS_MANAGER") === role}
                  className="mt-0.5 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium">{ROLE_LABELS[role]}</span>
                  <span className="block text-xs text-muted">{ROLE_HINTS[role]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {isNew ? (
              <>
                Contraseña <span className="text-danger">*</span>
              </>
            ) : (
              "Nueva contraseña"
            )}
            <input
              name="password"
              type="password"
              required={isNew}
              autoComplete="new-password"
              placeholder={isNew ? "Mínimo 8 caracteres" : "Déjala vacía para no cambiarla"}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Repite la contraseña
            <input name="password_repeat" type="password" autoComplete="new-password" className={fieldClass} />
          </label>
        </div>
        {!isNew && (
          <p className="-mt-2 text-xs text-muted">
            Si asignas una contraseña nueva, se cerrarán las sesiones abiertas de este usuario.
          </p>
        )}

        {isNew && (
          <label className="flex items-center gap-2 text-sm">
            <input name="active" type="checkbox" defaultChecked className="size-4 accent-primary" />
            Activo: puede iniciar sesión desde ahora
          </label>
        )}

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : isNew ? "Crear usuario" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
