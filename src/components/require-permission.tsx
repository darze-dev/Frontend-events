"use client";

// Si alguien escribe a mano la dirección de una pantalla que su rol no puede usar, ve este
// aviso en vez de una pantalla vacía o con errores. El backend igual rechaza la operación (403).
import Link from "next/link";
import type { ReactNode } from "react";

import type { Permission } from "@/lib/api/client";

import { useAuth } from "./auth-provider";
import { Icon } from "./icons";

export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth();
  if (can(permission)) return children;
  return (
    <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-8 text-center">
      <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
        <Icon name="lock" />
      </span>
      <p className="font-medium">Tu rol no tiene acceso a esta sección</p>
      <Link href="/inicio" className="mt-4 inline-block text-sm text-primary hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
