"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { clienteSchema, clienteEditSchema } from "@/lib/validation/clientes";
import type { ActionState } from "./types";

function mensajeError(error: { code?: string }): string {
  if (error.code === "23505") {
    return "Ya existe un cliente con ese nombre.";
  }
  if (error.code === "23503") {
    return "No se puede eliminar: este cliente tiene Proyectos asociados.";
  }
  return "No se pudo guardar el cliente. Intenta de nuevo.";
}

// Crear/editar/eliminar un Cliente queda solo para oficina (pedido
// explícito del usuario, 2026-08-14) -- Campo puede LEER la lista (para
// elegir un Proyecto al crear un Informe de Campo) pero no gestionarla,
// mismo criterio ya usado para editar/eliminar Informe de Campo.
export async function crearClienteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = clienteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").insert({
    nombre: parsed.data.nombre,
    cedula: parsed.data.cedula || null,
    ruc: parsed.data.ruc || null,
    ruc_dv: parsed.data.rucDv || null,
    telefono: parsed.data.telefono || null,
    direccion: parsed.data.direccion || null,
    correo: parsed.data.correo || null,
  });

  if (error) return { error: mensajeError(error), values: raw };

  revalidatePath("/informes/clientes");
  revalidatePath("/informes/proyectos/nuevo");
  redirect("/informes/clientes");
}

export async function editarClienteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = clienteEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({
      nombre: parsed.data.nombre,
      cedula: parsed.data.cedula || null,
      ruc: parsed.data.ruc || null,
      ruc_dv: parsed.data.rucDv || null,
      telefono: parsed.data.telefono || null,
      direccion: parsed.data.direccion || null,
      correo: parsed.data.correo || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: mensajeError(error), values: raw };

  revalidatePath("/informes/clientes");
  redirect("/informes/clientes");
}

export async function eliminarClienteAction(id: string) {
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw new Error(mensajeError(error));
  revalidatePath("/informes/clientes");
}
