"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { asistenciaSchema, asistenciaEditSchema } from "@/lib/validation/asistencia";
import {
  calcularPagoOficina,
  calcularPagoProyecto,
  type RolDia,
  type Jornada,
  type TipoProyecto,
} from "@/lib/calculoIncentivos";
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
    tipo_proyecto: parsed.data.tipoProyecto || null,
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
      tipo_proyecto: parsed.data.tipoProyecto || null,
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
  totalSugerido: number;
  diasOficina: number;
  diasProyecto: number;
  hectareasProyecto: number;
};

// Se llama directo desde el formulario de Pago (no vinculado a un <form>,
// igual que buscarViaticosCajaMenudaAction en lib/actions/proyectos.ts)
// para sugerirle al jefe/soporte un monto de quincena, calculado con las
// tarifas de lib/calculoIncentivos.ts -- el resultado PRE-LLENA el campo
// de monto, pero sigue siendo editable a mano (nunca se guarda solo).
//
// Para los días de tipo "proyecto" se necesitan las hectáreas trabajadas
// ese día, que no viven en Asistencia -- se buscan en Informes de Campo
// (informes_campo + informe_campo_parcelas) por colaborador+fecha, tanto
// si aparece como operador como si aparece en la lista de ayudantes.
export async function obtenerResumenAsistenciaAction(
  colaborador: string,
  fechaDesde: string,
  fechaHasta: string,
): Promise<ResumenAsistencia> {
  await requirePerfil();
  const supabase = await createClient();

  const { data: dias, error } = await supabase
    .from("planilla_asistencia")
    .select("fecha, rol_dia, tipo_trabajo, jornada, tipo_proyecto")
    .eq("colaborador", colaborador)
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);

  if (error) throw new Error(error.message || "No se pudo consultar la asistencia.");

  const diasProyectoFechas = [...new Set((dias ?? []).filter((d) => d.tipo_trabajo === "proyecto").map((d) => d.fecha))];

  const hectareasPorFecha = new Map<string, number>();
  if (diasProyectoFechas.length > 0) {
    const [{ data: comoOperador }, { data: comoAyudante }] = await Promise.all([
      supabase
        .from("informes_campo")
        .select("fecha, informe_campo_parcelas ( hectareas )")
        .eq("operador", colaborador)
        .in("fecha", diasProyectoFechas),
      supabase
        .from("informes_campo")
        .select("fecha, informe_campo_parcelas ( hectareas )")
        .contains("ayudantes", [colaborador])
        .in("fecha", diasProyectoFechas),
    ]);
    for (const informe of [...(comoOperador ?? []), ...(comoAyudante ?? [])]) {
      const hectareasInforme = (informe.informe_campo_parcelas ?? []).reduce(
        (s, p) => s + Number(p.hectareas),
        0,
      );
      const fecha = informe.fecha as string;
      hectareasPorFecha.set(fecha, (hectareasPorFecha.get(fecha) ?? 0) + hectareasInforme);
    }
  }

  let totalSugerido = 0;
  let diasOficina = 0;
  let diasProyecto = 0;
  let hectareasProyecto = 0;

  for (const dia of dias ?? []) {
    if (dia.tipo_trabajo === "oficina") {
      diasOficina += 1;
      totalSugerido += calcularPagoOficina(dia.rol_dia as RolDia, dia.jornada as Jornada);
    } else if (dia.tipo_trabajo === "proyecto" && dia.tipo_proyecto) {
      diasProyecto += 1;
      const hectareasDia = hectareasPorFecha.get(dia.fecha) ?? 0;
      hectareasProyecto += hectareasDia;
      totalSugerido += calcularPagoProyecto(dia.rol_dia as RolDia, dia.tipo_proyecto as TipoProyecto, hectareasDia);
    }
  }

  return {
    totalDias: dias?.length ?? 0,
    totalSugerido: Math.round(totalSugerido * 100) / 100,
    diasOficina,
    diasProyecto,
    hectareasProyecto,
  };
}
