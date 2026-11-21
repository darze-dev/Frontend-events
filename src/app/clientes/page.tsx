import type { Metadata } from "next";

import { ClientsScreen } from "./clients-screen";

export const metadata: Metadata = { title: "Clientes · Darze" };

export default function ClientsPage() {
  return <ClientsScreen />;
}
