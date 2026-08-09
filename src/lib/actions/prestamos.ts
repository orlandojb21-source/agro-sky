"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil, requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { prestamoSchema, prestamoEditSchema } from "@/lib/validation/prestamos";
import { obtenerPrestamoActivo, type Prestamo } from "@/lib/prestamos";
import { formatMoney } from "@/lib/format";
import type { ActionState } from "./types";

export type PrestamoActivo = Prestamo & { saldoPendiente: number };

export async function crearPrestamoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = prestamoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  // Un colaborador solo puede tener un préstamo activo a la vez (pedido
  // explícito del usuario) -- se bloquea antes de insertar uno nuevo.
  const activo = await obtenerPrestamoActivo(supabase, parsed.data.colaborador);
  if (activo) {
    return {
      error: `${parsed.data.colaborador} ya tiene un préstamo activo con saldo pendiente de ${formatMoney(activo.saldoPendiente)}. Hay que saldarlo antes de registrar uno nuevo.`,
      values: raw,
    };
  }

  const { error } = await supabase.from("prestamos").insert({
    colaborador: parsed.data.colaborador,
    fecha: parsed.data.fecha,
    monto: parsed.data.monto,
    cuota_quincenal: parsed.data.cuotaQuincenal,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el préstamo. Intenta de nuevo.", values: raw };

  revalidatePath("/planilla/prestamos");
  redirect("/planilla/prestamos");
}

export async function editarPrestamoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = prestamoEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("prestamos")
    .update({
      colaborador: parsed.data.colaborador,
      fecha: parsed.data.fecha,
      monto: parsed.data.monto,
      cuota_quincenal: parsed.data.cuotaQuincenal,
      nota: parsed.data.nota || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo guardar el préstamo. Intenta de nuevo.", values: raw };

  revalidatePath("/planilla/prestamos");
  redirect("/planilla/prestamos");
}

export async function eliminarPrestamoAction(id: string) {
  await requireWrite("planilla");
  const supabase = await createClient();

  // Si ya se le descontaron abonos en algún pago, no se puede eliminar
  // sin perder ese historial -- mismo criterio de otras eliminaciones
  // protegidas del sistema.
  const { data: abonos } = await supabase
    .from("planilla_pagos")
    .select("id")
    .eq("prestamo_id", id)
    .limit(1);

  if (abonos && abonos.length > 0) {
    throw new Error("Este préstamo ya tiene abonos registrados en pagos de planilla, no se puede eliminar.");
  }

  const { error } = await supabase.from("prestamos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el préstamo.");

  revalidatePath("/planilla/prestamos");
}

// Se llama directo desde el formulario de Pago (no vinculado a un
// <form>, igual que obtenerResumenControlHorarioAction) para saber si el
// colaborador elegido tiene un préstamo activo y sugerir su cuota como
// descuento -- el resultado pre-llena un campo editable, nunca se aplica
// solo.
export async function obtenerPrestamoActivoAction(
  colaborador: string,
): Promise<PrestamoActivo | null> {
  await requirePerfil();
  const supabase = await createClient();
  return obtenerPrestamoActivo(supabase, colaborador);
}
