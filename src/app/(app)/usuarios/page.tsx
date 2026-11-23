import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { UsersScreen } from "./users-screen";

export const metadata: Metadata = { title: "Usuarios · Darze" };

export default function UsersPage() {
  return (
    <RequirePermission permission="users:manage">
      <UsersScreen />
    </RequirePermission>
  );
}
