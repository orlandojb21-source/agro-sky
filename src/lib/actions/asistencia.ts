"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { asistenciaSchema, asistenciaEditSchema } from "@/lib/validation/asistencia";
import type { ActionState } from "./types";

export async function crearAsistenciaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = asistenciaSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("planilla_asistencia").insert({
    colaborador: parsed.data.colaborador,
    fecha: parsed.data.fecha,
    rol_dia: parsed.data.rolDia,
    tipo_trabajo: parsed.data.tipoTrabajo,
    jornada: parsed.data.jornada,
    descripcion: parsed.data.descripcion,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar la asistencia. Intenta de nuevo.", values: raw };

  revalidatePath("/planilla");
  redirect("/planilla");
}

export async function editarAsistenciaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = asistenciaEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("planilla_asistencia")
    .update({
      colaborador: parsed.data.colaborador,
      fecha: parsed.data.fecha,
      rol_dia: parsed.data.rolDia,
      tipo_trabajo: parsed.data.tipoTrabajo,
      jornada: parsed.data.jornada,
      descripcion: parsed.data.descripcion,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo actualizar la asistencia. Intenta de nuevo.", values: raw };

  revalidatePath("/planilla");
  redirect("/planilla");
}

export async function eliminarAsistenciaAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("planilla_asistencia").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la asistencia.");
  revalidatePath("/planilla");
}

export type ResumenAsistencia = {
  totalDias: number;
  porTipo: { etiqueta: string; dias: number }[];
};

const ETIQUETAS_RESUMEN: Record<string, string> = {
  "proyecto|proyecto": "Proyecto",
  "oficina|completo": "Oficina — Día completo",
  "oficina|medio": "Oficina — Medio día",
};

// Se llama directo desde el formulario de Pago (no vinculado a un <form>,
// igual que buscarPagosPlanillaProyectoAction/buscarViaticosCajaMenudaAction
// en lib/actions/proyectos.ts) para mostrarle al jefe/soporte, como
// referencia, cuanta asistencia acumulo un colaborador de Campo en el
// rango de la quincena antes de escribir el monto a mano.
export async function obtenerResumenAsistenciaAction(
  colaborador: string,
  fechaDesde: string,
  fechaHasta: string,
): Promise<ResumenAsistencia> {
  await requirePerfil();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planilla_asistencia")
    .select("tipo_trabajo, jornada")
    .eq("colaborador", colaborador)
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);

  if (error) throw new Error(error.message || "No se pudo consultar la asistencia.");

  const conteos = new Map<string, number>();
  for (const fila of data ?? []) {
    const clave = `${fila.tipo_trabajo}|${fila.jornada}`;
    conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
  }

  const porTipo = Array.from(conteos.entries())
    .map(([clave, dias]) => ({ etiqueta: ETIQUETAS_RESUMEN[clave] ?? clave, dias }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));

  return { totalDias: data?.length ?? 0, porTipo };
}
