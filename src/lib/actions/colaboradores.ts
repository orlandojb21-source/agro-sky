"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { colaboradorSchema } from "@/lib/validation/colaboradores";
import type { ActionState } from "./types";

function mensajeError(error: { code?: string }): string {
  if (error.code === "23505") {
    return "Ya existe un colaborador con ese nombre.";
  }
  return "No se pudo guardar el colaborador. Intenta de nuevo.";
}

export async function crearColaboradorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = colaboradorSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("colaboradores").insert({
    nombre: parsed.data.nombre,
    tipo: parsed.data.tipo,
    registrado_por: perfil.id,
  });

  if (error) return { error: mensajeError(error), values: raw };

  revalidatePath("/planilla/colaboradores");
  revalidatePath("/planilla");
  return { error: null, success: true };
}

export async function eliminarColaboradorAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("colaboradores").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el colaborador.");
  revalidatePath("/planilla/colaboradores");
  revalidatePath("/planilla");
}
