export type Rol = "administrador" | "jefe" | "soporte" | "campo" | "gerente" | "rrhh_contabilidad";

export const ROLES: Rol[] = ["administrador", "jefe", "soporte", "campo", "gerente", "rrhh_contabilidad"];

// "jefe"/"soporte" NO cambian de valor en la base de datos (cero riesgo de
// migrar cuentas existentes) -- solo se renombran acá, en la etiqueta que
// ve el usuario, como pidió explícitamente (2026-08-04): "jefe" pasa a
// mostrarse "Gerente General", "soporte" pasa a mostrarse "Soporte IT".
export const ROL_LABEL: Record<Rol, string> = {
  administrador: "Administrador",
  jefe: "Gerente General",
  soporte: "Soporte IT",
  campo: "Campo",
  gerente: "Gerente",
  rrhh_contabilidad: "Recursos Humanos y Contabilidad",
};

/** Secciones de navegacion, usadas tanto por el layout (gating) como por el menu. */
export type Seccion =
  | "inventario"
  | "bitacora"
  | "gastos-operativos"
  | "compras"
  | "planilla"
  | "ventas"
  | "balance"
  | "informes"
  | "usuarios";

export type NivelAcceso = "ninguno" | "lectura" | "escritura";

// Rediseño de roles (2026-08-04, pedido explícito del usuario): antes el
// acceso por sección era binario (se tenía o no se tenía). Ahora cada rol
// tiene un nivel por sección -- "ninguno" (no entra), "lectura" (ve, no
// puede crear/editar/borrar) o "escritura" (acceso completo). El nivel
// "lectura" se hace cumplir en 2 capas: acá + en la UI (esconder botones
// de escritura, src/lib/session.ts requireWrite() bloquea también cada
// Server Action de guardar/borrar del lado del servidor, no solo la UI).
//
// administrador y campo quedan igual que antes salvo lo pedido puntual
// (campo gana Bitácora). gerente es de solo lectura a las 9 secciones,
// sin excepción, incluidas Balance y Usuarios. rrhh_contabilidad escribe
// en Planilla/Caja Menuda/Compras/Balance/Ventas (Ventas se sumó
// 2026-08-06, tras aprobarse la Fase de roles), lee todo lo demás.
//
// Restricciones MÁS angostas que esta tabla (no caben en un modelo de 3
// niveles por sección) siguen viviendo aparte, sin tocar: esSoporteOJefe()
// más abajo (aprobar/rechazar Compras sigue exclusivo de jefe/soporte),
// la excepción de Campo en Informe de Campo (puede crear, no editar ni
// eliminar -- ver informesCampo.ts), y el permiso de rrhh_contabilidad
// sobre pagos de Fijos (vive en RLS, migración 0060, no acá).
export const SECTION_ACCESS: Record<Seccion, Record<Rol, NivelAcceso>> = {
  inventario: {
    administrador: "escritura",
    jefe: "escritura",
    soporte: "escritura",
    campo: "ninguno",
    gerente: "lectura",
    rrhh_contabilidad: "lectura",
  },
  bitacora: {
    administrador: "escritura",
    jefe: "escritura",
    soporte: "escritura",
    campo: "escritura",
    gerente: "lectura",
    rrhh_contabilidad: "lectura",
  },
  "gastos-operativos": {
    administrador: "escritura",
    jefe: "escritura",
    soporte: "escritura",
    campo: "ninguno",
    gerente: "lectura",
    rrhh_contabilidad: "escritura",
  },
  compras: {
    administrador: "escritura",
    jefe: "escritura",
    soporte: "escritura",
    campo: "ninguno",
    gerente: "lectura",
    rrhh_contabilidad: "escritura",
  },
  planilla: {
    administrador: "escritura",
    jefe: "escritura",
    soporte: "escritura",
    campo: "ninguno",
    gerente: "lectura",
    rrhh_contabilidad: "escritura",
  },
  ventas: {
    administrador: "escritura",
    jefe: "escritura",
    soporte: "escritura",
    campo: "ninguno",
    gerente: "lectura",
    rrhh_contabilidad: "escritura",
  },
  // Administrador no ve Balance -- pedido explícito del usuario, sin cambios.
  balance: {
    administrador: "ninguno",
    jefe: "escritura",
    soporte: "escritura",
    campo: "ninguno",
    gerente: "lectura",
    rrhh_contabilidad: "escritura",
  },
  informes: {
    administrador: "escritura",
    jefe: "escritura",
    soporte: "escritura",
    campo: "escritura",
    gerente: "lectura",
    rrhh_contabilidad: "lectura",
  },
  usuarios: {
    administrador: "ninguno",
    jefe: "escritura",
    soporte: "escritura",
    campo: "ninguno",
    gerente: "lectura",
    rrhh_contabilidad: "lectura",
  },
};

export function canAccess(rol: Rol | null | undefined, seccion: Seccion): boolean {
  if (!rol) return false;
  return SECTION_ACCESS[seccion][rol] !== "ninguno";
}

export function canWrite(rol: Rol | null | undefined, seccion: Seccion): boolean {
  if (!rol) return false;
  return SECTION_ACCESS[seccion][rol] === "escritura";
}

// Distingue soporte/jefe del resto dentro de una seccion que sigue abierta
// a mas roles pero donde una parte (ej. aprobar/rechazar Compras) es
// exclusiva de soporte/jefe.
export function esSoporteOJefe(rol: Rol | null | undefined): boolean {
  return rol === "soporte" || rol === "jefe";
}

// Gestionar el DRON como activo (crear/editar/eliminar drones, asignar o
// reasignar operador, editar/eliminar un Registro de Vuelo ya creado,
// eliminar un Mantenimiento) queda restringido a Administrador + Gerente
// General + Soporte IT (pedido explícito del usuario, 2026-08-12 y
// ampliado 2026-08-13) -- más angosto que la escritura general de
// Bitácora, que también tiene Campo. Campo sí puede CREAR Registros de
// Vuelo y Mantenimientos (preventivo/correctivo) -- solo no puede tocar
// el drone en sí ni editar/eliminar lo ya cargado.
export function puedeGestionarDrones(rol: Rol | null | undefined): boolean {
  return rol === "administrador" || esSoporteOJefe(rol);
}
