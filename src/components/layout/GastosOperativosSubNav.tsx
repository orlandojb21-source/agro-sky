"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/gastos-operativos", label: "Caja Menuda" },
  { href: "/gastos-operativos/gastos", label: "Gastos" },
];

export function GastosOperativosSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        // "Gastos" es un segmento propio (/gastos-operativos/gastos); "Caja
        // Menuda" es todo lo demás bajo /gastos-operativos (movimientos,
        // reposiciones, arqueos) -- por eso no alcanza con startsWith() para
        // ambos, hay que excluir explícitamente el segmento de Gastos.
        const activo =
          tab.href === "/gastos-operativos/gastos"
            ? pathname.startsWith("/gastos-operativos/gastos")
            : pathname === "/gastos-operativos" ||
              (pathname.startsWith("/gastos-operativos") && !pathname.startsWith("/gastos-operativos/gastos"));
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
