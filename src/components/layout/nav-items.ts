import type { Seccion } from "@/lib/roles";

export const NAV: { seccion: Seccion; href: string; label: string }[] = [
  { seccion: "inventario", href: "/inventario", label: "Inventario" },
  { seccion: "caja-menuda", href: "/caja-menuda", label: "Caja Menuda" },
  { seccion: "compras", href: "/compras", label: "Compras" },
  { seccion: "ventas", href: "/ventas", label: "Ventas" },
  { seccion: "balance", href: "/balance", label: "Balance" },
  { seccion: "usuarios", href: "/usuarios", label: "Usuarios" },
];
