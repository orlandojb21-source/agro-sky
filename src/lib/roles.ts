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
  | "bitacora"
  | "caja-menuda"
  | "compras"
  | "planilla"
  | "ventas"
  | "balance"
  | "proyectos"
  | "informes"
  | "usuarios";

// "soporte" es el rol tecnico (soporte de la app, no de atencion al
// cliente): tiene acceso total. "usuarios" es exclusiva de soporte y jefe
// (no administrador, por pedido explicito del usuario). Restringir alguna
// seccion por rol mas adelante solo requiere ajustar este mapa (mas la
// politica RLS equivalente en Supabase).
export const SECTION_ACCESS: Record<Seccion, Rol[]> = {
  inventario: ["administrador", "jefe", "soporte"],
  bitacora: ["administrador", "jefe", "soporte"],
  "caja-menuda": ["administrador", "jefe", "soporte"],
  compras: ["administrador", "jefe", "soporte"],
  planilla: ["administrador", "jefe", "soporte"],
  ventas: ["administrador", "jefe", "soporte"],
  // Administrador ya no ve Balance -- pedido explicito del usuario.
  balance: ["jefe", "soporte"],
  proyectos: ["administrador", "jefe", "soporte"],
  informes: ["administrador", "jefe", "soporte"],
  usuarios: ["soporte", "jefe"],
};

export function canAccess(rol: Rol | null | undefined, seccion: Seccion): boolean {
  if (!rol) return false;
  return SECTION_ACCESS[seccion].includes(rol);
}

// Distingue soporte/jefe del resto dentro de una seccion que sigue abierta
// a los 3 roles pero donde una parte (ej. Pagos de Planilla, aprobar
// Fijos) es exclusiva de soporte/jefe.
export function esSoporteOJefe(rol: Rol | null | undefined): boolean {
  return rol === "soporte" || rol === "jefe";
}
