"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSection, requireWrite } from "@/lib/session";
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
    decimo_tercer_mes: parsed.data.decimoTercerMes ? Number(parsed.data.decimoTercerMes) : null,
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
      decimo_tercer_mes: parsed.data.decimoTercerMes ? Number(parsed.data.decimoTercerMes) : null,
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

export type FilaReportePlanilla = { nombre: string; monto: number };
export type SeccionReportePlanilla = { etiqueta: string; filas: FilaReportePlanilla[]; total: number };
export type ReportePlanilla = {
  quincena1: SeccionReportePlanilla;
  quincena2: SeccionReportePlanilla;
  mes: SeccionReportePlanilla;
};

const MESES_REPORTE = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// Detalle de todo lo pagado en Planilla (Fijo y Campo) en un mes elegido,
// separado por quincena -- "monto" es lo que cada persona recibió de
// verdad esa vez (Monto + Bonificación + Décimo Tercer Mes − CSS − Seguro
// Educativo − abono de préstamo), no el gasto bruto de la empresa (eso ya
// lo calcula Balance con otro criterio, ver PagoPlanillaBalance en
// balance/page.tsx -- ahí sí cuenta el CSS/Seguro Educativo porque es
// plata que la empresa igual gastó, solo que no llegó al colaborador).
// RLS ya filtra los pagos de Fijo para quien no deba verlos
// (administrador), igual que en el resto de esta sección.
export async function obtenerReportePlanillaAction(anio: number, mes: number): Promise<ReportePlanilla> {
  await requireSection("planilla");
  const supabase = await createClient();

  const fechaDesde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const fechaHasta = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  const { data } = await supabase
    .from("planilla_pagos")
    .select("colaborador, fecha, monto, bonificacion, decimo_tercer_mes, css, seguro_educativo, monto_prestamo")
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);

  const porQuincena: [Map<string, number>, Map<string, number>] = [new Map(), new Map()];
  for (const p of data ?? []) {
    const nombre = p.colaborador as string;
    const dia = Number((p.fecha as string).slice(8, 10));
    const neto =
      Number(p.monto) +
      Number(p.bonificacion ?? 0) +
      Number(p.decimo_tercer_mes ?? 0) -
      Number(p.css ?? 0) -
      Number(p.seguro_educativo ?? 0) -
      Number(p.monto_prestamo ?? 0);
    const mapa = porQuincena[dia <= 15 ? 0 : 1];
    mapa.set(nombre, (mapa.get(nombre) ?? 0) + neto);
  }

  function aSeccion(mapa: Map<string, number>, etiqueta: string): SeccionReportePlanilla {
    const filas = Array.from(mapa.entries())
      .map(([nombre, monto]) => ({ nombre, monto: Math.round(monto * 100) / 100 }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { etiqueta, filas, total: Math.round(filas.reduce((s, f) => s + f.monto, 0) * 100) / 100 };
  }

  const mapaMes = new Map<string, number>();
  for (const mapa of porQuincena) {
    for (const [nombre, monto] of mapa.entries()) {
      mapaMes.set(nombre, (mapaMes.get(nombre) ?? 0) + monto);
    }
  }

  return {
    quincena1: aSeccion(porQuincena[0], `1 al 15 de ${MESES_REPORTE[mes - 1]}`),
    quincena2: aSeccion(porQuincena[1], `16 al ${ultimoDia} de ${MESES_REPORTE[mes - 1]}`),
    mes: aSeccion(mapaMes, `${MESES_REPORTE[mes - 1]} ${anio}`),
  };
}
