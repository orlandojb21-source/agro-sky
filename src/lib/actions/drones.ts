"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
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
      area_cubierta: parsed.data.areaCubierta,
      horas_vuelo: parsed.data.horasVuelo,
      vuelos: parsed.data.vuelos,
      registrado_por: perfil.id,
    })
    .select("id")
    .single();

  if (error || !drone) return { error: "No se pudo guardar el drone. Intenta de nuevo.", values: raw };

  if (parsed.data.operadorInicial) {
    await supabase.from("drones_operadores").insert({
      drone_id: drone.id,
      operador: parsed.data.operadorInicial,
      fecha_desde: parsed.data.fechaActivacion || new Date().toISOString().slice(0, 10),
      registrado_por: perfil.id,
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
      area_cubierta: parsed.data.areaCubierta,
      horas_vuelo: parsed.data.horasVuelo,
      vuelos: parsed.data.vuelos,
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

// Cierra la asignación vigente (si hay una) y abre una nueva -- queda el
// historial completo de quién tuvo el drone y desde/hasta cuándo, pedido
// explícito del usuario (2026-08-11).
export async function reasignarOperadorDroneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("bitacora");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = reasignarOperadorDroneSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  const { error: errorCierre } = await supabase
    .from("drones_operadores")
    .update({ fecha_hasta: parsed.data.fecha })
    .eq("drone_id", parsed.data.droneId)
    .is("fecha_hasta", null);
  if (errorCierre) {
    return { error: "No se pudo cerrar la asignación anterior. Intenta de nuevo.", values: raw };
  }

  const { error: errorNueva } = await supabase.from("drones_operadores").insert({
    drone_id: parsed.data.droneId,
    operador: parsed.data.operador,
    fecha_desde: parsed.data.fecha,
    registrado_por: perfil.id,
  });
  if (errorNueva) {
    return { error: "No se pudo registrar la nueva asignación. Intenta de nuevo.", values: raw };
  }

  revalidatePath(`/bitacora/${parsed.data.droneId}`);
  return { error: null, success: true };
}
