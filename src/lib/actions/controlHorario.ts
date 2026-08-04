"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { controlHorarioSchema, controlHorarioEditSchema } from "@/lib/validation/controlHorario";
import type { ActionState } from "./types";

function mensajeError(error: { code?: string }): string {
  if (error.code === "23505") {
    return "Ya hay un registro de este colaborador en esa fecha.";
  }
  return "No se pudo guardar el registro. Intenta de nuevo.";
}

export async function crearControlHorarioAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = controlHorarioSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("control_horario").insert({
    colaborador: parsed.data.colaborador,
    fecha: parsed.data.fecha,
    cumplio: parsed.data.cumplio,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: mensajeError(error), values: raw };

  revalidatePath("/planilla/horario");
  redirect("/planilla/horario");
}

export async function editarControlHorarioAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = controlHorarioEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("control_horario")
    .update({
      colaborador: parsed.data.colaborador,
      fecha: parsed.data.fecha,
      cumplio: parsed.data.cumplio,
      nota: parsed.data.nota || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: mensajeError(error), values: raw };

  revalidatePath("/planilla/horario");
  redirect("/planilla/horario");
}

export async function eliminarControlHorarioAction(id: string) {
  await requireWrite("planilla");
  const supabase = await createClient();
  const { error } = await supabase.from("control_horario").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el registro.");
  revalidatePath("/planilla/horario");
}
