import type { Seccion } from "@/lib/roles";

export const NAV: { seccion: Seccion; href: string; label: string }[] = [
  { seccion: "inventario", href: "/inventario/nuevos", label: "Nuevos" },
  { seccion: "inventario", href: "/inventario/usados", label: "Usados" },
  { seccion: "inventario", href: "/inventario/racks", label: "Racks" },
  { seccion: "usuarios", href: "/usuarios", label: "Usuarios" },
];
