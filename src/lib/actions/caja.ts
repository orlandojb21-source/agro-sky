"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  gastoSchema,
  reposicionSchema,
  previstoSchema,
  vueltoSchema,
  arqueoSchema,
} from "@/lib/validation/caja";
import { DENOMINACIONES, calcularSaldoActual } from "@/lib/caja";
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
    entregado: parsed.data.entregado,
    registrado_por: perfil.id,
  });

  if (error) return { error: mensajeErrorPrevisto(error), values: raw };

  revalidatePath("/caja-menuda");
  revalidatePath("/caja-menuda/previstos");
  redirect("/caja-menuda/previstos");
}

export async function eliminarPrevistoAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("caja_previstos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el previsto.");
  revalidatePath("/caja-menuda");
  revalidatePath("/caja-menuda/previstos");
}

// Registrar el vuelto es una actualizacion a un previsto ya guardado (no
// una creacion), asi que sigue la misma regla que eliminar: solo
// soporte/jefe (RLS lo exige de todas formas, esto es solo para dar un
// mensaje claro en vez de un error generico de Postgres).
export async function registrarVueltoAction(id: string, formData: FormData) {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = vueltoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Vuelto inválido");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("caja_previstos")
    .update({ vuelto: parsed.data.vuelto })
    .eq("id", id);

  if (error) throw new Error("No se pudo registrar el vuelto.");

  revalidatePath("/caja-menuda");
  revalidatePath("/caja-menuda/previstos");
}

export async function crearArqueoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = arqueoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const detalle: Record<string, number> = {};
  let totalContado = 0;
  for (const d of DENOMINACIONES) {
    const cantidad = Math.trunc(Number(raw[`cantidad_${d.id}`] || 0));
    detalle[d.id] = cantidad;
    totalContado += cantidad * d.valor;
  }
  totalContado = Math.round(totalContado * 100) / 100;

  const supabase = await createClient();
  const saldoEsperado = await calcularSaldoActual(supabase);
  const diferencia = Math.round((totalContado - saldoEsperado) * 100) / 100;

  const { error } = await supabase.from("caja_arqueos").insert({
    fecha: parsed.data.fecha,
    detalle,
    total_contado: totalContado,
    saldo_esperado: saldoEsperado,
    diferencia,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el arqueo. Intenta de nuevo.", values: raw };

  revalidatePath("/caja-menuda/arqueos");
  redirect("/caja-menuda/arqueos");
}

export async function eliminarArqueoAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("caja_arqueos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el arqueo.");
  revalidatePath("/caja-menuda/arqueos");
}
