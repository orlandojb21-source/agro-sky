"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { esSoporteOJefe } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { registrarVueloDroneSchema, editarRegistroVueloSchema } from "@/lib/validation/dronesVuelos";
import { fechaPermitida, MENSAJE_FECHA_NO_PERMITIDA } from "@/lib/fechaRestriccion";
import type { ActionState } from "./types";

// Pasa por el RPC registrar_vuelo_drone (migración 0075) en vez de un
// insert + update directo -- el operador carga la LECTURA NUEVA (el
// total acumulado a esa fecha, no lo que sumó ese trabajo); el RPC
// calcula la diferencia contra la lectura anterior del drone (de forma
// atómica, bloqueando la fila para no perder datos si 2 personas cargan
// un registro del mismo drone casi al mismo tiempo) y deja el drone con
// esos totales nuevos.
export async function registrarVueloDroneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("bitacora");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = registrarVueloDroneSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
    return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_vuelo_drone", {
    p_drone_id: parsed.data.droneId,
    p_fecha: parsed.data.fecha,
    p_operador: parsed.data.operador,
    p_horas_vuelo: parsed.data.horasVuelo,
    p_area_cubierta: parsed.data.areaCubierta,
    p_vuelos: parsed.data.vuelos,
  });

  if (error) return { error: "No se pudo guardar el registro. Intenta de nuevo.", values: raw };

  revalidatePath("/bitacora/vuelos");
  revalidatePath(`/bitacora/${parsed.data.droneId}`);
  revalidatePath("/bitacora");
  redirect("/bitacora/vuelos");
}

// Editar/eliminar registros de vuelo queda restringido a Soporte IT y
// Gerente General (jefe) -- pedido explícito del usuario 2026-08-11, más
// angosto que la escritura general de Bitácora (que también tienen
// Administrador y Campo). Mismo patrón que la excepción de Campo en
// Informe de Campo (informesCampo.ts): la restricción vive en el Server
// Action, no en el RPC (que solo exige auth_tiene_perfil()).
export async function editarRegistroVueloAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("bitacora");
  if (!esSoporteOJefe(perfil.rol)) redirect("/unauthorized");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = editarRegistroVueloSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("editar_registro_vuelo_drone", {
    p_registro_id: parsed.data.id,
    p_fecha: parsed.data.fecha,
    p_operador: parsed.data.operador,
    p_horas_vuelo: parsed.data.horasVuelo,
    p_area_cubierta: parsed.data.areaCubierta,
    p_vuelos: parsed.data.vuelos,
  });

  if (error) return { error: "No se pudo guardar el registro. Intenta de nuevo.", values: raw };

  revalidatePath("/bitacora/vuelos");
  revalidatePath("/bitacora");
  redirect("/bitacora/vuelos");
}

export async function eliminarRegistroVueloAction(id: string) {
  const perfil = await requireWrite("bitacora");
  if (!esSoporteOJefe(perfil.rol)) redirect("/unauthorized");

  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_registro_vuelo_drone", { p_registro_id: id });
  if (error) throw new Error("No se pudo eliminar el registro.");

  revalidatePath("/bitacora/vuelos");
  revalidatePath("/bitacora");
}
