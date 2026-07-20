export type Rol = "administrador" | "jefe" | "soporte";

export const ROLES: Rol[] = ["administrador", "jefe", "soporte"];

export const ROL_LABEL: Record<Rol, string> = {
  administrador: "Administrador",
  jefe: "Jefe",
  soporte: "Soporte",
};

/** Secciones de navegacion, usadas tanto por el layout (gating) como por el menu. */
export type Seccion =
  | "inventario"
  | "caja-menuda"
  | "compras"
  | "ventas"
  | "usuarios";

// Por ahora los 3 roles tienen el mismo acceso a todo salvo "usuarios", que
// es exclusiva de administrador. Restringir alguna seccion por rol mas
// adelante solo requiere ajustar este mapa (mas la politica RLS equivalente
// en Supabase).
export const SECTION_ACCESS: Record<Seccion, Rol[]> = {
  inventario: ["administrador", "jefe", "soporte"],
  "caja-menuda": ["administrador", "jefe", "soporte"],
  compras: ["administrador", "jefe", "soporte"],
  ventas: ["administrador", "jefe", "soporte"],
  usuarios: ["administrador"],
};

export function canAccess(rol: Rol | null | undefined, seccion: Seccion): boolean {
  if (!rol) return false;
  return SECTION_ACCESS[seccion].includes(rol);
}
