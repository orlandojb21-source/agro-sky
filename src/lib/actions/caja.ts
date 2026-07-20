"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { gastoSchema, reposicionSchema, previstoSchema } from "@/lib/validation/caja";
import type { ActionState } from "./types";

export async function crearGastoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = gastoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("caja_gastos").insert({
    fecha: parsed.data.fecha,
    nombre: parsed.data.nombre,
    concepto: parsed.data.concepto,
    monto: parsed.data.monto,
    colaborador: parsed.data.colaborador || null,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el gasto. Intenta de nuevo.", values: raw };

  revalidatePath("/caja-menuda");
  revalidatePath("/caja-menuda/previstos");
  redirect("/caja-menuda");
}

export async function eliminarGastoAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("caja_gastos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el gasto.");
  revalidatePath("/caja-menuda");
  revalidatePath("/caja-menuda/previstos");
}

export async function crearReposicionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = reposicionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("caja_reposiciones").insert({
    fecha: parsed.data.fecha,
    monto: parsed.data.monto,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar la reposición. Intenta de nuevo.", values: raw };

  revalidatePath("/caja-menuda");
  redirect("/caja-menuda");
}

export async function eliminarReposicionAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("caja_reposiciones").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la reposición.");
  revalidatePath("/caja-menuda");
}

function mensajeErrorPrevisto(error: { code?: string }): string {
  if (error.code === "23505") {
    return "Ya existe un previsto para ese colaborador en esa fecha.";
  }
  return "No se pudo guardar el previsto. Intenta de nuevo.";
}

export async function crearPrevistoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = previstoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("caja_previstos").insert({
    fecha: parsed.data.fecha,
    colaborador: parsed.data.colaborador,
    monto: parsed.data.monto,
    registrado_por: perfil.id,
  });

  if (error) return { error: mensajeErrorPrevisto(error), values: raw };

  revalidatePath("/caja-menuda/previstos");
  redirect("/caja-menuda/previstos");
}

export async function eliminarPrevistoAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("caja_previstos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el previsto.");
  revalidatePath("/caja-menuda/previstos");
}
