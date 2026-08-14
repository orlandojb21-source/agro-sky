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

// Clientes vive dentro de Ventas (movido desde Informes el 2026-08-14,
// pedido explícito del usuario) -- Campo ya es "ninguno" en la sección
// "ventas" (ver SECTION_ACCESS en lib/roles.ts), así que requireWrite ya
// lo bloquea por completo sin necesitar un chequeo de rol aparte (a
// diferencia de cuando vivía en "informes", donde Campo sí tenía
// escritura y hacía falta un redirect manual).
export async function crearClienteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("ventas");
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

  revalidatePath("/ventas/clientes");
  // El catálogo de Proyectos (Informes) lee esta misma tabla para su
  // <select> de Cliente -- se queda apuntando ahí, no se mueve.
  revalidatePath("/informes/proyectos/nuevo");
  redirect("/ventas/clientes");
}

export async function editarClienteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("ventas");
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

  revalidatePath("/ventas/clientes");
  redirect("/ventas/clientes");
}

export async function eliminarClienteAction(id: string) {
  await requireWrite("ventas");
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw new Error(mensajeError(error));
  revalidatePath("/ventas/clientes");
}
