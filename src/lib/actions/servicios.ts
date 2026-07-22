"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { servicioSchema, servicioEditSchema } from "@/lib/validation/servicios";
import type { ActionState } from "./types";

export async function crearServicioAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = servicioSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("servicios").insert({
    nombre: parsed.data.nombre,
    descripcion: parsed.data.descripcion || null,
    costo: parsed.data.costo,
    precio: parsed.data.precio,
    creado_por: perfil.id,
    actualizado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el servicio. Intenta de nuevo.", values: raw };

  revalidatePath("/inventario/servicios");
  redirect("/inventario/servicios");
}

export async function actualizarServicioAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = servicioEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("servicios")
    .update({
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion || null,
      costo: parsed.data.costo,
      precio: parsed.data.precio,
      actualizado_por: perfil.id,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo actualizar el servicio. Intenta de nuevo.", values: raw };

  revalidatePath("/inventario/servicios");
  redirect("/inventario/servicios");
}

export async function eliminarServicioAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("servicios").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el servicio.");
  revalidatePath("/inventario/servicios");
}
