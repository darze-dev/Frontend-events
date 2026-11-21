import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Darze",
  description: "Gestión de catering y eventos de Darze",
};

// Menú lateral. Los módulos sin pantalla todavía aparecen deshabilitados.
const MENU = [
  { href: "/clientes", label: "Clientes", ready: true },
  { href: "/catalogo", label: "Catálogo", ready: false },
  { href: "/cotizaciones", label: "Cotizaciones", ready: false },
  { href: "/eventos", label: "Eventos", ready: false },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full">
        <aside className="w-56 shrink-0 border-r border-zinc-200 p-5 dark:border-zinc-800">
          <p className="mb-6 text-xl font-bold text-amber-500">Darze</p>
          <nav className="space-y-1 text-sm">
            {MENU.map((item) =>
              item.ready ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {item.label}
                </Link>
              ) : (
                <span key={item.href} className="block cursor-not-allowed px-3 py-2 text-zinc-400">
                  {item.label} <small>(pronto)</small>
                </span>
              ),
            )}
          </nav>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </body>
    </html>
  );
}
