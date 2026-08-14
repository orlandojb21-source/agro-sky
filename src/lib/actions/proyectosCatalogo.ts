"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { proyectoCatalogoSchema, proyectoCatalogoEditSchema } from "@/lib/validation/proyectosCatalogo";
import type { ActionState } from "./types";

// Nombre del archivo distinto de "proyectos.ts" (Análisis de Proyecto,
// módulo ya existente y sin relación con este) para no chocar -- este es
// el catálogo nuevo de Proyectos al que se ligan los Informes de Campo.

function mensajeError(error: { code?: string }): string {
  if (error.code === "23503") {
    return "No se puede eliminar: este proyecto tiene Informes de Campo asociados.";
  }
  return "No se pudo guardar el proyecto. Intenta de nuevo.";
}

// Crear/editar/eliminar un Proyecto queda solo para oficina (pedido
// explícito del usuario, 2026-08-14) -- Campo puede LEER la lista (para
// elegirlo al crear un Informe de Campo) pero no gestionarla, mismo
// criterio ya usado para Clientes y para editar/eliminar Informe de Campo.
export async function crearProyectoCatalogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = proyectoCatalogoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("proyectos").insert({
    nombre: parsed.data.nombre,
    cliente_id: parsed.data.clienteId,
    tipo_proyecto: parsed.data.tipoProyecto,
    registrado_por: perfil.id,
  });

  if (error) return { error: mensajeError(error), values: raw };

  revalidatePath("/informes/proyectos");
  revalidatePath("/informes/campo/nuevo");
  redirect("/informes/proyectos");
}

export async function editarProyectoCatalogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = proyectoCatalogoEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("proyectos")
    .update({
      nombre: parsed.data.nombre,
      cliente_id: parsed.data.clienteId,
      tipo_proyecto: parsed.data.tipoProyecto,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: mensajeError(error), values: raw };

  revalidatePath("/informes/proyectos");
  redirect("/informes/proyectos");
}

export async function eliminarProyectoCatalogoAction(id: string) {
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");
  const supabase = await createClient();
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw new Error(mensajeError(error));
  revalidatePath("/informes/proyectos");
}
