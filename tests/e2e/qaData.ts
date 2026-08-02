import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./env";

// Cliente con la service_role key -- SOLO para armar/limpiar datos de
// prueba directamente en la base de datos real (se salta RLS a propósito,
// igual que cualquier script de mantenimiento). Nunca se usa dentro de un
// flujo que el navegador ejecute -- eso siempre pasa por la sesión real de
// cada cuenta QA.
export const adminDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const PASSWORD_QA = "QaTest12345!";
export const PREFIJO_QA = "QA Suite";

export type RolQA = "administrador" | "jefe" | "soporte";

export type CuentaQA = {
  rol: RolQA;
  email: string;
  password: string;
  userId: string;
};

export async function crearCuentaQA(rol: RolQA): Promise<CuentaQA> {
  const email = `qa.suite.${rol}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@agrosky-test.local`;

  const { data: userData, error: userErr } = await adminDb.auth.admin.createUser({
    email,
    password: PASSWORD_QA,
    email_confirm: true,
  });
  if (userErr || !userData.user) throw new Error(`No se pudo crear la cuenta QA (${rol}): ${userErr?.message}`);

  const { error: perfilErr } = await adminDb
    .from("perfiles")
    .insert({ id: userData.user.id, nombre_completo: `${PREFIJO_QA} ${rol}`, rol });
  if (perfilErr) throw new Error(`No se pudo crear el perfil QA (${rol}): ${perfilErr.message}`);

  return { rol, email, password: PASSWORD_QA, userId: userData.user.id };
}

export async function eliminarCuentaQA(cuenta: CuentaQA): Promise<void> {
  const { error: perfilErr } = await adminDb.from("perfiles").delete().eq("id", cuenta.userId);
  if (perfilErr) {
    console.warn(`No se pudo borrar el perfil QA (${cuenta.email}): ${perfilErr.message}`);
  }
  const { error: authErr } = await adminDb.auth.admin.deleteUser(cuenta.userId);
  if (authErr) {
    console.warn(`No se pudo borrar la cuenta QA (${cuenta.email}): ${authErr.message}`);
  }
}

// Red de seguridad extra: cualquier cuenta con el patrón de correo que usa
// esta suite (qa.suite.<rol>.<...>@agrosky-test.local) que haya quedado de
// una corrida anterior interrumpida (ej. el proceso se mató a mitad de
// camino, antes de que corriera globalTeardown) -- global-setup la llama
// antes de crear las cuentas nuevas de esta corrida.
export async function limpiarCuentasQAHuerfanas(): Promise<void> {
  const { data } = await adminDb.auth.admin.listUsers({ perPage: 1000 });
  const huerfanas = (data?.users ?? []).filter((u) => u.email?.startsWith("qa.suite."));
  for (const usuario of huerfanas) {
    await adminDb.from("perfiles").delete().eq("id", usuario.id);
    await adminDb.auth.admin.deleteUser(usuario.id);
  }
}

// Barrido final: cualquier fila con el prefijo QA en las tablas que tocan
// los specs de esta suite, sin importar qué test la haya creado -- red de
// seguridad además de la limpieza que ya hace cada spec por su cuenta.
//
// Importante: NO se usan los RPC eliminar_informe_campo/eliminar_informe_proyecto
// aquí -- son "security definer" pero igual exigen auth_tiene_perfil()
// (basado en auth.uid()), que la service_role key no satisface por sí sola
// al llamarse desde un script (no hay un usuario real detrás). Se borra la
// fila del encabezado directo con el cliente de service_role (que sí se
// salta RLS) y las tablas hijas se limpian solas por el ON DELETE CASCADE
// ya definido en el esquema.
export async function limpiarDatosQA(): Promise<void> {
  const { data: informesCampo } = await adminDb
    .from("informes_campo")
    .select("id, firma_agro_ruta, firma_cliente_ruta")
    .ilike("cliente", `${PREFIJO_QA}%`);
  for (const informe of informesCampo ?? []) {
    const rutas = [informe.firma_agro_ruta, informe.firma_cliente_ruta].filter(
      (r): r is string => Boolean(r),
    );
    if (rutas.length > 0) await adminDb.storage.from("informes-campo-firmas").remove(rutas);
    await adminDb.from("informes_campo").delete().eq("id", informe.id);
  }

  const { data: informesDiarios } = await adminDb
    .from("informes_diarios")
    .select("id, imagen_control_ruta")
    .ilike("cliente", `${PREFIJO_QA}%`);
  for (const informe of informesDiarios ?? []) {
    if (informe.imagen_control_ruta) {
      await adminDb.storage.from("informes-diarios-capturas").remove([informe.imagen_control_ruta]);
    }
    await adminDb.from("informes_diarios").delete().eq("id", informe.id);
  }

  await adminDb.from("proyecto_informes").delete().ilike("proyecto", `${PREFIJO_QA}%`);

  await adminDb.from("planilla_pagos").delete().ilike("colaborador", `${PREFIJO_QA}%`);
  await adminDb.from("planilla_asistencia").delete().ilike("colaborador", `${PREFIJO_QA}%`);
  await adminDb.from("colaboradores").delete().ilike("nombre", `${PREFIJO_QA}%`);
}
