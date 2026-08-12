"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { pagoSchema, pagoEditSchema, parseDetalleCalculo } from "@/lib/validation/planilla";
import { fechaPermitida, MENSAJE_FECHA_NO_PERMITIDA, MENSAJE_REGISTRO_FECHA_VIEJA } from "@/lib/fechaRestriccion";
import { esSoporteOJefe } from "@/lib/roles";
import type { ActionState } from "./types";

export async function crearPagoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = pagoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  // Solo "fecha" (cuándo se pagó) -- "fechaDesde" describe el periodo que
  // se paga (quincena), casi siempre en el pasado, no se restringe.
  if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
    return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("planilla_pagos").insert({
    colaborador: parsed.data.colaborador,
    fecha: parsed.data.fecha,
    fecha_desde: parsed.data.fechaDesde || null,
    descripcion: parsed.data.descripcion,
    monto: parsed.data.monto,
    tipo_trabajo: parsed.data.tipoTrabajo || null,
    jornada: parsed.data.jornada || null,
    css: parsed.data.css ? Number(parsed.data.css) : null,
    seguro_educativo: parsed.data.seguroEducativo ? Number(parsed.data.seguroEducativo) : null,
    bonificacion: parsed.data.bonificacion ? Number(parsed.data.bonificacion) : null,
    prestamo_id: parsed.data.prestamoId || null,
    monto_prestamo: parsed.data.montoPrestamo ? Number(parsed.data.montoPrestamo) : null,
    detalle_calculo: parseDetalleCalculo(parsed.data.detalleCalculo),
    // Todo pago de planilla es, por definicion, categoria "Planilla" -- no
    // hace falta que el usuario la elija (a diferencia de Caja Menuda,
    // donde un gasto si puede ser de varios tipos).
    categoria: "Planilla",
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el pago. Intenta de nuevo.", values: raw };

  revalidatePath("/planilla/pagos");
  redirect("/planilla/pagos");
}

export async function editarPagoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = pagoEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  if (!esSoporteOJefe(perfil.rol)) {
    const { data: pagoActual } = await supabase
      .from("planilla_pagos")
      .select("fecha")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (pagoActual && !fechaPermitida(pagoActual.fecha as string, perfil.rol)) {
      return { error: MENSAJE_REGISTRO_FECHA_VIEJA, values: raw };
    }
    if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
      return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
    }
  }

  const { error } = await supabase
    .from("planilla_pagos")
    .update({
      colaborador: parsed.data.colaborador,
      fecha: parsed.data.fecha,
      fecha_desde: parsed.data.fechaDesde || null,
      descripcion: parsed.data.descripcion,
      monto: parsed.data.monto,
      tipo_trabajo: parsed.data.tipoTrabajo || null,
      jornada: parsed.data.jornada || null,
      css: parsed.data.css ? Number(parsed.data.css) : null,
      seguro_educativo: parsed.data.seguroEducativo ? Number(parsed.data.seguroEducativo) : null,
      bonificacion: parsed.data.bonificacion ? Number(parsed.data.bonificacion) : null,
      prestamo_id: parsed.data.prestamoId || null,
      monto_prestamo: parsed.data.montoPrestamo ? Number(parsed.data.montoPrestamo) : null,
      detalle_calculo: parseDetalleCalculo(parsed.data.detalleCalculo),
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo actualizar el pago. Intenta de nuevo.", values: raw };

  revalidatePath("/planilla/pagos");
  redirect("/planilla/pagos");
}

export async function eliminarPagoAction(id: string) {
  await requireWrite("planilla");
  const supabase = await createClient();
  const { error } = await supabase.from("planilla_pagos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el pago.");
  revalidatePath("/planilla/pagos");
}
