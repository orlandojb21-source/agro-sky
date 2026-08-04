"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { colaboradorSchema, colaboradorEditSchema } from "@/lib/validation/colaboradores";
import { eliminarFotoColaboradorAction } from "@/lib/actions/colaboradorFoto";
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
  const perfil = await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = colaboradorSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("colaboradores").insert({
    nombre: parsed.data.nombre,
    tipo: parsed.data.tipo,
    salario: parsed.data.tipo === "fijo" ? Number(parsed.data.salario) : null,
    aplica_deducciones: parsed.data.tipo === "fijo" ? parsed.data.aplicaDeducciones : true,
    cedula: parsed.data.cedula || null,
    correo: parsed.data.correo || null,
    telefono: parsed.data.telefono || null,
    direccion: parsed.data.direccion || null,
    foto_ruta: parsed.data.fotoRuta || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: mensajeError(error), values: raw };

  revalidatePath("/planilla/colaboradores");
  revalidatePath("/planilla");
  revalidatePath("/planilla/pagos");
  return { error: null, success: true };
}

export async function editarColaboradorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = colaboradorEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("colaboradores")
    .update({
      nombre: parsed.data.nombre,
      tipo: parsed.data.tipo,
      salario: parsed.data.tipo === "fijo" ? Number(parsed.data.salario) : null,
      aplica_deducciones: parsed.data.tipo === "fijo" ? parsed.data.aplicaDeducciones : true,
      cedula: parsed.data.cedula || null,
      correo: parsed.data.correo || null,
      telefono: parsed.data.telefono || null,
      direccion: parsed.data.direccion || null,
      foto_ruta: parsed.data.fotoRuta || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: mensajeError(error), values: raw };

  // Si se reemplazó o se quitó la foto, se limpia la anterior en Storage
  // (best-effort, ver eliminarFotoColaboradorAction) para no ir dejando
  // archivos huérfanos acumulándose.
  const fotoRutaAnterior = raw.fotoRutaAnterior;
  if (fotoRutaAnterior && fotoRutaAnterior !== parsed.data.fotoRuta) {
    await eliminarFotoColaboradorAction(fotoRutaAnterior).catch(() => {});
  }

  revalidatePath("/planilla/colaboradores");
  revalidatePath("/planilla");
  revalidatePath("/planilla/pagos");
  redirect("/planilla/colaboradores");
}

export async function eliminarColaboradorAction(id: string) {
  await requireWrite("planilla");
  const supabase = await createClient();

  const { data: colaborador } = await supabase
    .from("colaboradores")
    .select("foto_ruta")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("colaboradores").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el colaborador.");

  if (colaborador?.foto_ruta) {
    await eliminarFotoColaboradorAction(colaborador.foto_ruta).catch(() => {});
  }

  revalidatePath("/planilla/colaboradores");
  revalidatePath("/planilla");
  revalidatePath("/planilla/pagos");
}
