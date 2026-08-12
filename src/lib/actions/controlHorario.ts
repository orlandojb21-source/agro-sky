"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil, requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { controlHorarioSchema, controlHorarioEditSchema } from "@/lib/validation/controlHorario";
import { fechaPermitida, MENSAJE_FECHA_NO_PERMITIDA, MENSAJE_REGISTRO_FECHA_VIEJA } from "@/lib/fechaRestriccion";
import { esSoporteOJefe } from "@/lib/roles";
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

  if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
    return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
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
  const perfil = await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = controlHorarioEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  if (!esSoporteOJefe(perfil.rol)) {
    const { data: registroActual } = await supabase
      .from("control_horario")
      .select("fecha")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (registroActual && !fechaPermitida(registroActual.fecha as string, perfil.rol)) {
      return { error: MENSAJE_REGISTRO_FECHA_VIEJA, values: raw };
    }
    if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
      return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
    }
  }

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

// Horario real de un colaborador Fijo (confirmado por el usuario,
// 2026-08-05): Lunes a Viernes 8 horas, Sábado 4 horas, Domingo libre --
// 44 horas semanales. "fechaISO" llega como "YYYY-MM-DD"; se arma como
// fecha UTC para no depender de la zona horaria del servidor al leer el
// día de la semana (mismo principio que lib/planilla.ts).
function horasDelDia(fechaISO: string): number {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(); // 0=domingo ... 6=sábado
  if (diaSemana === 0) return 0;
  if (diaSemana === 6) return 4;
  return 8;
}

export type DetalleAusenciaControlHorario = {
  fecha: string;
  horas: number;
  descuento: number;
};

export type ResumenControlHorario = {
  horasEsperadas: number;
  diasEsperados: number;
  diasAusentes: number;
  totalDescuento: number;
  totalSugerido: number;
  detalle: DetalleAusenciaControlHorario[];
};

// Se llama directo desde el formulario de Pago (no vinculado a un <form>,
// igual que obtenerResumenAsistenciaAction en lib/actions/asistencia.ts)
// para sugerirle al jefe/soporte/administrador un monto de quincena para
// un colaborador Fijo, descontando los días marcados "No" en Control de
// Horario dentro del rango -- el resultado PRE-LLENA el campo de monto,
// pero sigue siendo editable a mano (nunca se guarda solo).
//
// El valor de "un día" se calcula por hora, no un monto fijo por día: se
// reparte "salarioBase" entre las horas reales que le tocaba trabajar en
// toda la quincena (Lunes a Sábado, con Sábado valiendo la mitad de un
// día entre semana), y cada ausencia descuenta sus propias horas -- así
// un sábado ausente descuenta la mitad que un día entre semana ausente
// (pedido explícito del usuario, 2026-08-05).
export async function obtenerResumenControlHorarioAction(
  colaborador: string,
  fechaDesde: string,
  fechaHasta: string,
  salarioBase: number,
): Promise<ResumenControlHorario> {
  await requirePerfil();
  const supabase = await createClient();

  const { data: ausencias, error } = await supabase
    .from("control_horario")
    .select("fecha")
    .eq("colaborador", colaborador)
    .eq("cumplio", false)
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);

  if (error) throw new Error(error.message || "No se pudo consultar el control de horario.");

  let horasEsperadas = 0;
  let diasEsperados = 0;
  const cursor = new Date(`${fechaDesde}T00:00:00Z`);
  const fin = new Date(`${fechaHasta}T00:00:00Z`);
  while (cursor.getTime() <= fin.getTime()) {
    const horas = horasDelDia(cursor.toISOString().slice(0, 10));
    if (horas > 0) {
      horasEsperadas += horas;
      diasEsperados += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const valorHora = horasEsperadas > 0 ? salarioBase / horasEsperadas : 0;

  const detalle: DetalleAusenciaControlHorario[] = (ausencias ?? [])
    .map((a) => {
      const fecha = a.fecha as string;
      const horas = horasDelDia(fecha);
      return { fecha, horas, descuento: Math.round(valorHora * horas * 100) / 100 };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const totalDescuento = Math.round(detalle.reduce((s, d) => s + d.descuento, 0) * 100) / 100;
  const totalSugerido = Math.max(0, Math.round((salarioBase - totalDescuento) * 100) / 100);

  return {
    horasEsperadas,
    diasEsperados,
    diasAusentes: detalle.length,
    totalDescuento,
    totalSugerido,
    detalle,
  };
}
