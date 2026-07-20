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
  | "balance"
  | "reportes"
  | "usuarios";

// "soporte" es el rol tecnico (soporte de la app, no de atencion al
// cliente): tiene acceso total. "usuarios" es exclusiva de soporte y jefe
// (no administrador, por pedido explicito del usuario). Restringir alguna
// seccion por rol mas adelante solo requiere ajustar este mapa (mas la
// politica RLS equivalente en Supabase).
export const SECTION_ACCESS: Record<Seccion, Rol[]> = {
  inventario: ["administrador", "jefe", "soporte"],
  "caja-menuda": ["administrador", "jefe", "soporte"],
  compras: ["administrador", "jefe", "soporte"],
  ventas: ["administrador", "jefe", "soporte"],
  balance: ["administrador", "jefe", "soporte"],
  reportes: ["administrador", "jefe", "soporte"],
  usuarios: ["soporte", "jefe"],
};

export function canAccess(rol: Rol | null | undefined, seccion: Seccion): boolean {
  if (!rol) return false;
  return SECTION_ACCESS[seccion].includes(rol);
}

// No usado actualmente en ningun lado (Caja Menuda volvio a estar abierta a
// los 3 roles). Se deja definida para cuando se agregue un rol nuevo mas
// restringido -- ese es el caso en el que de verdad hace falta distinguir
// soporte/jefe del resto, no los 3 roles de hoy.
export function esSoporteOJefe(rol: Rol | null | undefined): boolean {
  return rol === "soporte" || rol === "jefe";
}
