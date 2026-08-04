export type Rol = "administrador" | "jefe" | "soporte" | "campo";

export const ROLES: Rol[] = ["administrador", "jefe", "soporte", "campo"];

export const ROL_LABEL: Record<Rol, string> = {
  administrador: "Administrador",
  jefe: "Jefe",
  soporte: "Soporte",
  campo: "Campo",
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
  | "informes"
  | "usuarios";

// "soporte" es el rol tecnico (soporte de la app, no de atencion al
// cliente): tiene acceso total. "usuarios" es exclusiva de soporte y jefe
// (no administrador, por pedido explicito del usuario). Restringir alguna
// seccion por rol mas adelante solo requiere ajustar este mapa (mas la
// politica RLS equivalente en Supabase).
//
// "campo" es un rol nuevo y deliberadamente acotado (pedido explicito del
// usuario, 2026-08-03): solo entra a Informes -- y dentro de Informes,
// ademas, solo al tab "Informe de Campo" (esa restriccion mas fina no cabe
// en este mapa por seccion; se aplica en informes/diario/layout.tsx e
// informes/proyecto/layout.tsx). No se agrega a ninguna otra seccion.
export const SECTION_ACCESS: Record<Seccion, Rol[]> = {
  inventario: ["administrador", "jefe", "soporte"],
  bitacora: ["administrador", "jefe", "soporte"],
  "caja-menuda": ["administrador", "jefe", "soporte"],
  compras: ["administrador", "jefe", "soporte"],
  planilla: ["administrador", "jefe", "soporte"],
  ventas: ["administrador", "jefe", "soporte"],
  // Administrador ya no ve Balance -- pedido explicito del usuario.
  balance: ["jefe", "soporte"],
  informes: ["administrador", "jefe", "soporte", "campo"],
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
