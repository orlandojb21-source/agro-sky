"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Rol } from "@/lib/roles";

const TABS = [
  { href: "/informes/proyectos", label: "Proyectos" },
  { href: "/informes/clientes", label: "Clientes" },
  { href: "/informes/campo", label: "Informe de Campo" },
  { href: "/informes/diario", label: "Informe Diario" },
  { href: "/informes/proyecto", label: "Análisis de Proyecto" },
];

export function InformesSubNav({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  // El rol "campo" solo entra a Informe de Campo -- ver la nota en
  // SECTION_ACCESS (src/lib/roles.ts). Ocultar los otros tabs aquí es
  // solo cosmético; la restricción real está en los layouts de cada
  // sub-ruta (informes/proyectos, informes/clientes, informes/diario,
  // informes/proyecto).
  const tabs = rol === "campo" ? TABS.filter((t) => t.href === "/informes/campo") : TABS;

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const activo = pathname.startsWith(tab.href);
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
