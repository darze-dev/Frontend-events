"use client";

// Nueva cotización (HU07): al guardar queda en borrador, con su código, y se abre su detalle.
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/icons";

import { QuoteEditor } from "../quote-editor";

export function NewQuoteScreen() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <header>
        <Link href="/cotizaciones" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Cotizaciones
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Nueva cotización</h1>
        <p className="mt-1 text-sm text-muted">Se guarda como borrador: podrás modificarla antes de enviarla.</p>
      </header>
      <QuoteEditor
        onSaved={(quote) => router.replace(`/cotizaciones/${quote.id}?nueva=1`)}
        onCancel={() => router.push("/cotizaciones")}
      />
    </div>
  );
}
