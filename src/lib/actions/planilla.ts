"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { pagoSchema, pagoEditSchema } from "@/lib/validation/planilla";
import type { ActionState } from "./types";

export async function crearPagoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = pagoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("planilla_pagos").insert({
    colaborador: parsed.data.colaborador,
    fecha: parsed.data.fecha,
    descripcion: parsed.data.descripcion,
    monto: parsed.data.monto,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el pago. Intenta de nuevo.", values: raw };

  revalidatePath("/planilla");
  redirect("/planilla");
}

export async function editarPagoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = pagoEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("planilla_pagos")
    .update({
      colaborador: parsed.data.colaborador,
      fecha: parsed.data.fecha,
      descripcion: parsed.data.descripcion,
      monto: parsed.data.monto,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo actualizar el pago. Intenta de nuevo.", values: raw };

  revalidatePath("/planilla");
  redirect("/planilla");
}

export async function eliminarPagoAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("planilla_pagos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el pago.");
  revalidatePath("/planilla");
}
