import type { Metadata } from "next";

import { RequirePermission } from "@/components/require-permission";

import { StaffScreen } from "./staff-screen";

export const metadata: Metadata = { title: "Personal · Darze" };

export default function StaffPage() {
  return (
    <RequirePermission permission="staff:manage">
      <StaffScreen />
    </RequirePermission>
  );
}
