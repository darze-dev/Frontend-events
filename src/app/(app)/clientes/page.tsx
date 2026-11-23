import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { ClientsScreen } from "./clients-screen";

export const metadata: Metadata = { title: "Clientes · Darze" };

export default function ClientsPage() {
  return (
    <RequirePermission permission="clients:manage">
      <ClientsScreen />
    </RequirePermission>
  );
}
