"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  productoCreateSchema,
  productoUpdateSchema,
} from "@/lib/validation/productos";
import { segmentoDesdeTipo } from "@/lib/inventario-tipo";
import type { ActionState } from "./types";

function mensajeError(error: { code?: string }): string {
  if (error.code === "23505") {
    return "Ya existe un producto con ese número de parte en esta sección.";
  }
  return "No se pudo guardar el producto. Intenta de nuevo.";
}

export async function crearProductoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = productoCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      values: raw,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("productos").insert({
    tipo: parsed.data.tipo,
    numero_parte: parsed.data.numeroParte,
    descripcion: parsed.data.descripcion,
    cantidad: parsed.data.cantidad,
    costo: parsed.data.costo,
    venta: parsed.data.venta,
    rack: parsed.data.rack || null,
    contenedor: parsed.data.contenedor || null,
    unidad: parsed.data.unidad || null,
    creado_por: perfil.id,
    actualizado_por: perfil.id,
  });

  if (error) return { error: mensajeError(error), values: raw };

  const seccion = segmentoDesdeTipo(parsed.data.tipo);
  revalidatePath(`/inventario/${seccion}`);
  redirect(`/inventario/${seccion}`);
}

export async function actualizarProductoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = productoUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      values: raw,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("productos")
    .update({
      numero_parte: parsed.data.numeroParte,
      descripcion: parsed.data.descripcion,
      cantidad: parsed.data.cantidad,
      costo: parsed.data.costo,
      venta: parsed.data.venta,
      rack: parsed.data.rack || null,
      contenedor: parsed.data.contenedor || null,
      unidad: parsed.data.unidad || null,
      actualizado_por: perfil.id,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: mensajeError(error), values: raw };

  const seccion = segmentoDesdeTipo(parsed.data.tipo);
  revalidatePath(`/inventario/${seccion}`);
  redirect(`/inventario/${seccion}`);
}

export async function eliminarProductoAction(id: string, seccion: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el producto.");
  revalidatePath(`/inventario/${seccion}`);
}
