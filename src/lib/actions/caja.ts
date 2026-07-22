"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  gastoSchema,
  gastoEditSchema,
  reposicionSchema,
  reposicionEditSchema,
  vueltoSchema,
  arqueoSchema,
} from "@/lib/validation/caja";
import { DENOMINACIONES, calcularSaldoActual, detalleDesdeFormData } from "@/lib/caja";
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

  const monto = detalleDesdeFormData(raw, "monto");
  const entregado = detalleDesdeFormData(raw, "entregado");
  const vuelto = detalleDesdeFormData(raw, "vuelto");

  const supabase = await createClient();
  const { error } = await supabase.from("caja_gastos").insert({
    fecha: parsed.data.fecha,
    nombre: parsed.data.nombre || null,
    concepto: parsed.data.concepto || null,
    monto: monto?.total ?? null,
    monto_detalle: monto?.detalle ?? null,
    colaborador: parsed.data.colaborador || null,
    previsto: parsed.data.previsto,
    entregado: entregado?.total ?? null,
    entregado_detalle: entregado?.detalle ?? null,
    vuelto: vuelto?.total ?? null,
    vuelto_detalle: vuelto?.detalle ?? null,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el movimiento. Intenta de nuevo.", values: raw };

  revalidatePath("/caja-menuda");
  redirect("/caja-menuda");
}

export async function editarGastoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = gastoEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const monto = detalleDesdeFormData(raw, "monto");
  const entregado = detalleDesdeFormData(raw, "entregado");
  const vuelto = detalleDesdeFormData(raw, "vuelto");

  const supabase = await createClient();
  const { error } = await supabase
    .from("caja_gastos")
    .update({
      fecha: parsed.data.fecha,
      nombre: parsed.data.nombre || null,
      concepto: parsed.data.concepto || null,
      monto: monto?.total ?? null,
      monto_detalle: monto?.detalle ?? null,
      colaborador: parsed.data.colaborador || null,
      previsto: parsed.data.previsto,
      entregado: entregado?.total ?? null,
      entregado_detalle: entregado?.detalle ?? null,
      vuelto: vuelto?.total ?? null,
      vuelto_detalle: vuelto?.detalle ?? null,
      nota: parsed.data.nota || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo actualizar el movimiento. Intenta de nuevo.", values: raw };

  revalidatePath("/caja-menuda");
  redirect("/caja-menuda");
}

export async function eliminarGastoAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("caja_gastos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el movimiento.");
  revalidatePath("/caja-menuda");
}

// Registrar el vuelto directo desde la tabla de Movimientos (sin pasar por
// la pantalla de editar completa) -- se usa en la mini-forma inline de
// MovimientosTabla para los movimientos que tienen "entregado" pero aun no
// tienen "vuelto".
export async function registrarVueltoAction(id: string, formData: FormData) {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = vueltoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Vuelto inválido");
  }

  const vuelto = detalleDesdeFormData(raw, "vuelto");

  const supabase = await createClient();
  const { error } = await supabase
    .from("caja_gastos")
    .update({ vuelto: vuelto?.total ?? null, vuelto_detalle: vuelto?.detalle ?? null })
    .eq("id", id);

  if (error) throw new Error("No se pudo registrar el vuelto.");

  revalidatePath("/caja-menuda");
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

  const monto = detalleDesdeFormData(raw, "monto");
  if (!monto) {
    return { error: "Marca al menos un billete o moneda repuesto.", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("caja_reposiciones").insert({
    fecha: parsed.data.fecha,
    monto: monto.total,
    monto_detalle: monto.detalle,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar la reposición. Intenta de nuevo.", values: raw };

  revalidatePath("/caja-menuda");
  redirect("/caja-menuda");
}

export async function editarReposicionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = reposicionEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const monto = detalleDesdeFormData(raw, "monto");
  if (!monto) {
    return { error: "Marca al menos un billete o moneda repuesto.", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("caja_reposiciones")
    .update({
      fecha: parsed.data.fecha,
      monto: monto.total,
      monto_detalle: monto.detalle,
      nota: parsed.data.nota || null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "No se pudo actualizar la reposición. Intenta de nuevo.", values: raw };
  }

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
