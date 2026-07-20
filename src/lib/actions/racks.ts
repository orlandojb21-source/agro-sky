"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  rackCreateSchema,
  contenedorCreateSchema,
} from "@/lib/validation/racks";
import type { ActionState } from "./types";

function mensajeError(
  error: { code?: string },
  contexto: "rack" | "contenedor",
): string {
  if (error.code === "23505") {
    return contexto === "rack"
      ? "Ya existe un rack con ese nombre."
      : "Ya existe un contenedor con ese nombre en este rack.";
  }
  return "No se pudo guardar. Intenta de nuevo.";
}

export async function crearRackAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const parsed = rackCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("racks").insert({
    nombre: parsed.data.nombre,
    creado_por: perfil.id,
  });
  if (error) return { error: mensajeError(error, "rack") };

  revalidatePath("/inventario/racks");
  return { error: null };
}

export async function eliminarRackAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("racks").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el rack.");
  revalidatePath("/inventario/racks");
}

export async function crearContenedorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const parsed = contenedorCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contenedores").insert({
    rack_id: parsed.data.rackId,
    nombre: parsed.data.nombre,
  });
  if (error) return { error: mensajeError(error, "contenedor") };

  revalidatePath("/inventario/racks");
  return { error: null };
}

export async function eliminarContenedorAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("contenedores").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el contenedor.");
  revalidatePath("/inventario/racks");
}
