"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { informeProyectoSchema } from "@/lib/validation/proyectos";
import type { ActionState } from "./types";

export async function crearInformeProyectoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let operaciones: unknown;
  let personal: unknown;
  try {
    operaciones = JSON.parse(raw.operaciones || "[]");
    personal = JSON.parse(raw.personal || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const precioReferencia =
    raw.precioReferencia && raw.precioReferencia.trim() !== "" ? Number(raw.precioReferencia) : null;

  const parsed = informeProyectoSchema.safeParse({
    proyecto: raw.proyecto,
    ubicacion: raw.ubicacion,
    fechaDesde: raw.fechaDesde,
    fechaHasta: raw.fechaHasta,
    precioReferencia: Number.isNaN(precioReferencia) ? null : precioReferencia,
    operaciones,
    personal,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { data: informeId, error } = await supabase.rpc("crear_informe_proyecto", {
    p_proyecto: parsed.data.proyecto,
    p_ubicacion: parsed.data.ubicacion || null,
    p_fecha_desde: parsed.data.fechaDesde,
    p_fecha_hasta: parsed.data.fechaHasta,
    p_precio_referencia: parsed.data.precioReferencia,
    p_operaciones: parsed.data.operaciones.map((op) => ({
      slot: op.slot,
      operador: op.operador || null,
      diesel: op.diesel,
      gasolina: op.gasolina,
      viaticos: op.viaticos,
      planilla: op.planilla,
      alquiler_drone: op.alquilerDrone,
      alquiler_carro: op.alquilerCarro,
      lavado_carro: op.lavadoCarro,
      tramos: op.tramos,
    })),
    p_personal: parsed.data.personal.map((p) => ({
      nombre: p.nombre,
      rol: p.rol,
      dias: p.dias,
    })),
  });

  if (error) {
    return {
      error: error.message || "No se pudo guardar el informe. Intenta de nuevo.",
      values: raw,
    };
  }

  revalidatePath("/proyectos");
  redirect(`/proyectos/${informeId}`);
}

export async function eliminarInformeProyectoAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_informe_proyecto", { p_informe_id: id });
  if (error) throw new Error(error.message || "No se pudo eliminar el informe.");
  revalidatePath("/proyectos");
}
