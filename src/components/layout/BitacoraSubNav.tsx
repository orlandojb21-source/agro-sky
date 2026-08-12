"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/bitacora", label: "Drones" },
  { href: "/bitacora/vuelos", label: "Registro de Vuelo" },
];

export function BitacoraSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        // "Registro de Vuelo" es su propio segmento (/bitacora/vuelos);
        // "Drones" es todo lo demás bajo /bitacora (lista, nuevo, ficha,
        // editar) -- mismo criterio que GastosOperativosSubNav.
        const activo =
          tab.href === "/bitacora/vuelos"
            ? pathname.startsWith("/bitacora/vuelos")
            : pathname === "/bitacora" || !pathname.startsWith("/bitacora/vuelos");
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
