import type { Seccion } from "@/lib/roles";

export const NAV: { seccion: Seccion; href: string; label: string }[] = [
  { seccion: "inventario", href: "/inventario", label: "Inventario" },
  { seccion: "bitacora", href: "/bitacora", label: "Bitácora" },
  { seccion: "caja-menuda", href: "/caja-menuda", label: "Caja Menuda" },
  { seccion: "compras", href: "/compras", label: "Compras" },
  { seccion: "planilla", href: "/planilla", label: "Planilla" },
  { seccion: "ventas", href: "/ventas", label: "Ventas" },
  { seccion: "informes", href: "/informes/campo", label: "Informes" },
  { seccion: "balance", href: "/balance", label: "Balance" },
  { seccion: "usuarios", href: "/usuarios", label: "Usuarios" },
];
