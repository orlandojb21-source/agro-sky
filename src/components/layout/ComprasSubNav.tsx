"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/compras", label: "Solicitudes de Compra" },
  { href: "/compras/ordenes", label: "Órdenes de Compra" },
  { href: "/compras/proveedores", label: "Proveedores" },
];

export function ComprasSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const activo =
          tab.href === "/compras"
            ? pathname === "/compras" || /^\/compras\/(nueva|[0-9a-f-]+)$/.test(pathname)
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              activo
                ? "rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                : "rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
