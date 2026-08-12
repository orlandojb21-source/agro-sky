"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { puedeReasignarOperadorDrone } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { droneSchema, droneEditSchema, reasignarOperadorDroneSchema } from "@/lib/validation/drones";
import type { ActionState } from "./types";

export async function crearDroneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const perfil = await requireWrite("bitacora");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = droneSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { data: drone, error } = await supabase
    .from("drones")
    .insert({
      nombre: parsed.data.nombre,
      modelo: parsed.data.modelo,
      fecha_activacion: parsed.data.fechaActivacion || null,
      numero_serie_aeronave: parsed.data.numeroSerieAeronave || null,
      numero_serie_placa_fc: parsed.data.numeroSeriePlacaFc || null,
      numero_serie_fabrica: parsed.data.numeroSerieFabrica || null,
      estado: parsed.data.estado,
      estado_detalle: parsed.data.estadoDetalle || null,
      registrado_por: perfil.id,
    })
    .select("id")
    .single();

  if (error || !drone) return { error: "No se pudo guardar el drone. Intenta de nuevo.", values: raw };

  // El RPC reasignar_operador_drone (migración 0075) cierra automáticamente
  // cualquier asignación vigente que ese operador tuviera en otro drone --
  // un operador es único por drone a la vez, desde el momento en que se
  // le asigna, incluso al crear el drone nuevo. Asignar operador queda
  // restringido a Administrador/Gerente General/Soporte IT (mismo criterio
  // que reasignarOperadorDroneAction) -- si alguien sin ese permiso mandó
  // igual un operadorInicial (no debería, el campo está oculto en el
  // formulario para esos roles), se ignora en silencio en vez de bloquear
  // la creación del drone por eso.
  if (parsed.data.operadorInicial && puedeReasignarOperadorDrone(perfil.rol)) {
    await supabase.rpc("reasignar_operador_drone", {
      p_drone_id: drone.id,
      p_operador: parsed.data.operadorInicial,
      p_fecha: parsed.data.fechaActivacion || new Date().toISOString().slice(0, 10),
    });
  }

  revalidatePath("/bitacora");
  redirect(`/bitacora/${drone.id}`);
}

export async function editarDroneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWrite("bitacora");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = droneEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("drones")
    .update({
      nombre: parsed.data.nombre,
      modelo: parsed.data.modelo,
      fecha_activacion: parsed.data.fechaActivacion || null,
      numero_serie_aeronave: parsed.data.numeroSerieAeronave || null,
      numero_serie_placa_fc: parsed.data.numeroSeriePlacaFc || null,
      numero_serie_fabrica: parsed.data.numeroSerieFabrica || null,
      estado: parsed.data.estado,
      estado_detalle: parsed.data.estadoDetalle || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo guardar el drone. Intenta de nuevo.", values: raw };

  revalidatePath("/bitacora");
  revalidatePath(`/bitacora/${parsed.data.id}`);
  redirect(`/bitacora/${parsed.data.id}`);
}

export async function eliminarDroneAction(id: string) {
  await requireWrite("bitacora");
  const supabase = await createClient();
  const { error } = await supabase.from("drones").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el drone.");
  revalidatePath("/bitacora");
}

// Pasa por el RPC reasignar_operador_drone (migración 0075): cierra la
// asignación vigente de este drone Y cualquier asignación vigente que el
// operador elegido tuviera en OTRO drone (un operador es único por drone
// a la vez -- ej. si su drone entró a mantenimiento y se lo pasa a otro),
// y abre la nueva. Todo en una sola transacción atómica.
export async function reasignarOperadorDroneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("bitacora");
  if (!puedeReasignarOperadorDrone(perfil.rol)) redirect("/unauthorized");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = reasignarOperadorDroneSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reasignar_operador_drone", {
    p_drone_id: parsed.data.droneId,
    p_operador: parsed.data.operador,
    p_fecha: parsed.data.fecha,
  });

  if (error) return { error: "No se pudo reasignar el operador. Intenta de nuevo.", values: raw };

  revalidatePath(`/bitacora/${parsed.data.droneId}`);
  revalidatePath("/bitacora");
  return { error: null, success: true };
}
