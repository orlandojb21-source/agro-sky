"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { informeProyectoSchema, informeProyectoEditSchema } from "@/lib/validation/proyectos";
import type { ActionState } from "./types";

export async function crearInformeProyectoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let filas: unknown;
  let gastosOperativos: unknown;
  try {
    filas = JSON.parse(raw.filas || "[]");
    gastosOperativos = JSON.parse(raw.gastosOperativos || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const parsed = informeProyectoSchema.safeParse({
    proyecto: raw.proyecto,
    ubicacion: raw.ubicacion,
    hectareas: raw.hectareas,
    precio: raw.precio,
    total: raw.total,
    fechaDesde: raw.fechaDesde,
    fechaHasta: raw.fechaHasta,
    filas,
    gastosOperativos,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { data: informeId, error } = await supabase.rpc("crear_informe_proyecto", {
    p_proyecto: parsed.data.proyecto,
    p_ubicacion: parsed.data.ubicacion || null,
    p_hectareas: parsed.data.hectareas,
    p_precio: parsed.data.precio,
    p_total: parsed.data.total,
    p_fecha_desde: parsed.data.fechaDesde,
    p_fecha_hasta: parsed.data.fechaHasta,
    p_filas: parsed.data.filas.map((f) => ({
      drone: f.drone,
      hectareas: f.hectareas,
      precio: f.precio,
    })),
    p_gastos_operativos: parsed.data.gastosOperativos.map((b) => ({
      drone: b.drone,
      items: b.items.map((it) => ({
        categoria: it.categoria,
        cantidad: it.cantidad,
        precio: it.precio,
      })),
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

export async function editarInformeProyectoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let filas: unknown;
  let gastosOperativos: unknown;
  try {
    filas = JSON.parse(raw.filas || "[]");
    gastosOperativos = JSON.parse(raw.gastosOperativos || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const parsed = informeProyectoEditSchema.safeParse({
    id: raw.id,
    proyecto: raw.proyecto,
    ubicacion: raw.ubicacion,
    hectareas: raw.hectareas,
    precio: raw.precio,
    total: raw.total,
    fechaDesde: raw.fechaDesde,
    fechaHasta: raw.fechaHasta,
    filas,
    gastosOperativos,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("editar_informe_proyecto", {
    p_informe_id: parsed.data.id,
    p_proyecto: parsed.data.proyecto,
    p_ubicacion: parsed.data.ubicacion || null,
    p_hectareas: parsed.data.hectareas,
    p_precio: parsed.data.precio,
    p_total: parsed.data.total,
    p_fecha_desde: parsed.data.fechaDesde,
    p_fecha_hasta: parsed.data.fechaHasta,
    p_filas: parsed.data.filas.map((f) => ({
      drone: f.drone,
      hectareas: f.hectareas,
      precio: f.precio,
    })),
    p_gastos_operativos: parsed.data.gastosOperativos.map((b) => ({
      drone: b.drone,
      items: b.items.map((it) => ({
        categoria: it.categoria,
        cantidad: it.cantidad,
        precio: it.precio,
      })),
    })),
  });

  if (error) {
    return {
      error: error.message || "No se pudo actualizar el informe. Intenta de nuevo.",
      values: raw,
    };
  }

  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${parsed.data.id}`);
  redirect(`/proyectos/${parsed.data.id}`);
}

export async function eliminarInformeProyectoAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_informe_proyecto", { p_informe_id: id });
  if (error) throw new Error(error.message || "No se pudo eliminar el informe.");
  revalidatePath("/proyectos");
}
