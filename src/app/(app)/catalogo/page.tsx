import type { Metadata } from "next";

import { CatalogScreen } from "./catalog-screen";

export const metadata: Metadata = { title: "Catálogo · Darze" };

export default function CatalogPage() {
  return <CatalogScreen />;
}
