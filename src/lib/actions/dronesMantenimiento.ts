"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  mantenimientoPreventivoSchema,
  mantenimientoCorrectivoSchema,
} from "@/lib/validation/dronesMantenimiento";
import type { ActionState } from "./types";

export async function crearMantenimientoPreventivoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("bitacora");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = mantenimientoPreventivoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  // La "foto" de los totales del dron se toma AHORA (servidor), no de lo
  // que el formulario tenía cargado al abrirse -- evita guardar una foto
  // vieja si pasó tiempo entre abrir el formulario y guardar.
  const { data: drone } = await supabase
    .from("drones")
    .select("horas_vuelo, area_cubierta, vuelos")
    .eq("id", parsed.data.droneId)
    .maybeSingle();
  if (!drone) return { error: "No se encontró el drone.", values: raw };

  const { error } = await supabase.from("drones_mantenimientos_preventivos").insert({
    drone_id: parsed.data.droneId,
    tipo: parsed.data.tipo,
    fecha: parsed.data.fecha,
    horas_vuelo_en_mantenimiento: drone.horas_vuelo,
    area_cubierta_en_mantenimiento: drone.area_cubierta,
    vuelos_en_mantenimiento: drone.vuelos,
    intervalo_horas: parsed.data.intervaloHoras || null,
    intervalo_hectareas: parsed.data.intervaloHectareas || null,
    intervalo_vuelos: parsed.data.intervaloVuelos || null,
    intervalo_meses: parsed.data.intervaloMeses || null,
    notas: parsed.data.notas || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el mantenimiento. Intenta de nuevo.", values: raw };

  revalidatePath("/bitacora/mantenimiento");
  revalidatePath(`/bitacora/${parsed.data.droneId}`);
  redirect("/bitacora/mantenimiento");
}

export async function eliminarMantenimientoPreventivoAction(id: string) {
  await requireWrite("bitacora");
  const supabase = await createClient();
  const { error } = await supabase.from("drones_mantenimientos_preventivos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el mantenimiento.");
  revalidatePath("/bitacora/mantenimiento");
}

export async function crearMantenimientoCorrectivoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("bitacora");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let piezas: unknown;
  try {
    piezas = JSON.parse(raw.piezas || "[]");
  } catch {
    return { error: "No se pudieron leer las piezas cargadas. Intenta de nuevo.", values: raw };
  }

  const parsed = mantenimientoCorrectivoSchema.safeParse({
    droneId: raw.droneId,
    fecha: raw.fecha,
    motivo: raw.motivo,
    piezas,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("crear_mantenimiento_correctivo", {
    p_drone_id: parsed.data.droneId,
    p_fecha: parsed.data.fecha,
    p_motivo: parsed.data.motivo,
    p_piezas: parsed.data.piezas.map((p) => ({ productoId: p.productoId, cantidad: p.cantidad })),
  });

  if (error) {
    // "No hay stock suficiente para..." llega tal cual desde el RPC --
    // es el único caso donde vale la pena mostrar el mensaje real en vez
    // de uno genérico (le dice al usuario exactamente qué pieza revisar).
    const mensaje = error.message?.includes("No hay stock suficiente")
      ? error.message
      : "No se pudo guardar el mantenimiento. Intenta de nuevo.";
    return { error: mensaje, values: raw };
  }

  revalidatePath("/bitacora/mantenimiento");
  revalidatePath(`/bitacora/${parsed.data.droneId}`);
  revalidatePath("/inventario/nuevos");
  revalidatePath("/inventario/usados");
  redirect("/bitacora/mantenimiento");
}

export async function eliminarMantenimientoCorrectivoAction(id: string) {
  await requireWrite("bitacora");
  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_mantenimiento_correctivo", { p_correctivo_id: id });
  if (error) throw new Error("No se pudo eliminar el mantenimiento.");
  revalidatePath("/bitacora/mantenimiento");
  revalidatePath("/inventario/nuevos");
  revalidatePath("/inventario/usados");
}
