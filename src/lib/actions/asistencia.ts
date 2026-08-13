"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil, requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { asistenciaSchema, asistenciaEditSchema } from "@/lib/validation/asistencia";
import { fechaPermitida, MENSAJE_FECHA_NO_PERMITIDA, MENSAJE_REGISTRO_FECHA_VIEJA } from "@/lib/fechaRestriccion";
import { esSoporteOJefe } from "@/lib/roles";
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
  const perfil = await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = asistenciaSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
    return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("planilla_asistencia").insert({
    colaborador: parsed.data.colaborador,
    fecha: parsed.data.fecha,
    rol_dia: parsed.data.rolDia,
    tipo_trabajo: parsed.data.tipoTrabajo,
    jornada: parsed.data.jornada,
    tipo_proyecto: parsed.data.tipoTrabajo === "sin_trabajo" ? parsed.data.tipoProyecto : null,
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
  const perfil = await requireWrite("planilla");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = asistenciaEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  if (!esSoporteOJefe(perfil.rol)) {
    const { data: asistenciaActual } = await supabase
      .from("planilla_asistencia")
      .select("fecha")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (asistenciaActual && !fechaPermitida(asistenciaActual.fecha as string, perfil.rol)) {
      return { error: MENSAJE_REGISTRO_FECHA_VIEJA, values: raw };
    }
    if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
      return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
    }
  }

  const { error } = await supabase
    .from("planilla_asistencia")
    .update({
      colaborador: parsed.data.colaborador,
      fecha: parsed.data.fecha,
      rol_dia: parsed.data.rolDia,
      tipo_trabajo: parsed.data.tipoTrabajo,
      jornada: parsed.data.jornada,
      tipo_proyecto: parsed.data.tipoTrabajo === "sin_trabajo" ? parsed.data.tipoProyecto : null,
      descripcion: parsed.data.descripcion,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo actualizar la asistencia. Intenta de nuevo.", values: raw };

  revalidatePath("/planilla");
  redirect("/planilla");
}

export async function eliminarAsistenciaAction(id: string) {
  await requireWrite("planilla");
  const supabase = await createClient();
  const { error } = await supabase.from("planilla_asistencia").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la asistencia.");
  revalidatePath("/planilla");
}

// Una fila por cada Informe de Campo que coincide con un día de Asistencia
// (no una fila por día) -- si una persona trabajó en 2 proyectos el mismo
// día, aparecen 2 filas separadas, cada una con su propio cálculo. Un día
// de Oficina siempre es 1 sola fila, igual que un día "sin_trabajo" (ver
// más abajo). Un día de Proyecto sin ningún Informe de Campo asociado
// aparece con monto 0 para que el jefe lo note y lo complete a mano.
export type DetalleDiaAsistencia = {
  fecha: string;
  rolDia: RolDia;
  tipoTrabajo: "oficina" | "proyecto" | "sin_trabajo";
  jornada: Jornada | null;
  tipoProyecto: TipoProyecto | null;
  hectareas: number | null;
  clienteInforme: string | null;
  // Solo aplica a "sin_trabajo" -- el motivo (lluvia, falla mecánica,
  // etc.) guardado en Asistencia. Null en Oficina/Proyecto normal.
  motivo: string | null;
  monto: number;
};

export type ResumenAsistencia = {
  totalDias: number;
  totalSugerido: number;
  diasOficina: number;
  diasProyecto: number;
  // Días de Proyecto sin Informe (no se pudo trabajar) -- aparte de
  // diasProyecto (que solo cuenta Informes de Campo reales), para que el
  // resumen distinga claramente cuánto de lo sugerido viene de cada uno.
  diasSinTrabajo: number;
  hectareasProyecto: number;
  detalle: DetalleDiaAsistencia[];
};

type InformeCampoFila = {
  id: string;
  fecha: string;
  cliente: string;
  tipo_proyecto: TipoProyecto | null;
  jornada: Jornada;
};

// Un día adicional (2do, 3er, etc.) de un Informe de Campo Particular
// "Abierto" -- ver migración 0085. Mismo tratamiento que un Informe de
// Campo normal (1 fila por día, su propia contabilidad de hectáreas),
// solo que el tipo_proyecto/cliente salen del informe padre, no del día
// mismo.
type InformeCampoDiaFila = {
  id: string;
  fecha: string;
  jornada: Jornada;
  informes_campo: { cliente: string; tipo_proyecto: TipoProyecto | null } | null;
};

// Se llama directo desde el formulario de Pago (no vinculado a un <form>,
// igual que buscarViaticosCajaMenudaAction en lib/actions/proyectos.ts)
// para sugerirle al jefe/soporte un monto de quincena, calculado con las
// tarifas de lib/calculoIncentivos.ts -- el resultado PRE-LLENA el campo
// de monto, pero sigue siendo editable a mano (nunca se guarda solo).
//
// Desde 2026-08-10: Asistencia solo registra Oficina y "sin_trabajo" -- el
// Informe de Campo es la única fuente para un día de Proyecto con trabajo
// normal (Ingenio Santa Rosa/Particular). "sin_trabajo" (2026-08-13) es la
// excepción: un día en que el equipo fue a trabajar pero no se pudo regar
// (lluvia, falla mecánica, etc.), así que no existe ningún Informe de
// Campo de ese día -- se calcula igual que un Informe con 0 hectáreas
// (calcularPagoProyecto ya paga el salario base sin excedente), pero sale
// de planilla_asistencia en vez de informes_campo. Cada Informe de Campo
// tiene su propia contabilidad de hectáreas -- si una persona aparece en
// más de un informe el mismo día, NUNCA se suman las hectáreas entre esos
// informes, cada uno se calcula por separado con su propio tipo de
// proyecto, jornada y hectáreas, y los montos resultantes se suman al
// final.
export async function obtenerResumenAsistenciaAction(
  colaborador: string,
  fechaDesde: string,
  fechaHasta: string,
): Promise<ResumenAsistencia> {
  await requirePerfil();
  const supabase = await createClient();

  const { data: diasAsistencia, error } = await supabase
    .from("planilla_asistencia")
    .select("fecha, rol_dia, tipo_trabajo, jornada, tipo_proyecto, descripcion")
    .eq("colaborador", colaborador)
    .in("tipo_trabajo", ["oficina", "sin_trabajo"])
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);

  if (error) throw new Error(error.message || "No se pudo consultar la asistencia.");

  const [
    { data: comoOperador, error: errorOperador },
    { data: comoAyudante, error: errorAyudante },
    { data: diasComoOperador, error: errorDiasOperador },
    { data: diasComoAyudante, error: errorDiasAyudante },
  ] = await Promise.all([
    supabase
      .from("informes_campo")
      .select("id, fecha, cliente, tipo_proyecto, jornada")
      .eq("operador", colaborador)
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta),
    supabase
      .from("informes_campo")
      .select("id, fecha, cliente, tipo_proyecto, jornada")
      .contains("ayudantes", [colaborador])
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta),
    // Días adicionales de un informe Particular "Abierto" (migración
    // 0085) -- mismo criterio, pero el cliente/tipo_proyecto salen del
    // informe padre (embed simple, no son 2 relaciones hermanas en la
    // misma consulta, así que no cae en el problema de PostgREST con
    // embeds hermanos).
    supabase
      .from("informe_campo_dias")
      .select("id, fecha, jornada, informes_campo ( cliente, tipo_proyecto )")
      .eq("operador", colaborador)
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta),
    supabase
      .from("informe_campo_dias")
      .select("id, fecha, jornada, informes_campo ( cliente, tipo_proyecto )")
      .contains("ayudantes", [colaborador])
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta),
  ]);

  if (errorOperador || errorAyudante || errorDiasOperador || errorDiasAyudante) {
    throw new Error("No se pudo consultar los Informes de Campo.");
  }

  // Hectáreas de cada día adicional -- consulta aparte (no embebida junto
  // a "informes_campo" arriba) para no anidar 2 relaciones hermanas en
  // una sola consulta, mismo problema de PostgREST ya documentado en
  // Bitácora > Mantenimiento.
  const diasFilas = [
    ...(diasComoOperador ?? []),
    ...(diasComoAyudante ?? []),
  ] as unknown as InformeCampoDiaFila[];
  const idsDias = diasFilas.map((d) => d.id);
  const hectareasPorDia = new Map<string, number>();
  if (idsDias.length > 0) {
    const { data: parcelasDias } = await supabase
      .from("informe_campo_parcelas")
      .select("dia_id, hectareas")
      .in("dia_id", idsDias);
    for (const p of parcelasDias ?? []) {
      const diaId = p.dia_id as string;
      hectareasPorDia.set(diaId, (hectareasPorDia.get(diaId) ?? 0) + Number(p.hectareas));
    }
  }

  // Hectáreas del día 1 (header) de cada informe -- también aparte, y
  // filtrando dia_id IS NULL explícitamente: en un Particular "Abierto"
  // multi-día, informe_campo_parcelas tiene filas de TODOS los días bajo
  // el mismo informe_id (día 1 = dia_id null, día 2+ = dia_id del hijo),
  // así que un embed simple aquí sumaría las hectáreas de todos los días
  // dentro del día 1. Mismo criterio que hectareasPorDia arriba.
  const informesFilas = [
    ...(comoOperador ?? []),
    ...(comoAyudante ?? []),
  ] as unknown as InformeCampoFila[];
  const idsInformes = informesFilas.map((i) => i.id);
  const hectareasPorInforme = new Map<string, number>();
  if (idsInformes.length > 0) {
    const { data: parcelasInformes } = await supabase
      .from("informe_campo_parcelas")
      .select("informe_id, hectareas")
      .in("informe_id", idsInformes)
      .is("dia_id", null);
    for (const p of parcelasInformes ?? []) {
      const informeId = p.informe_id as string;
      hectareasPorInforme.set(informeId, (hectareasPorInforme.get(informeId) ?? 0) + Number(p.hectareas));
    }
  }

  let totalSugerido = 0;
  let diasOficinaCount = 0;
  let diasSinTrabajoCount = 0;
  let diasProyecto = 0;
  let hectareasProyecto = 0;
  const detalle: DetalleDiaAsistencia[] = [];

  for (const dia of diasAsistencia ?? []) {
    if (dia.tipo_trabajo === "sin_trabajo") {
      diasSinTrabajoCount += 1;
      const monto = calcularPagoProyecto(
        dia.rol_dia as RolDia,
        dia.tipo_proyecto as TipoProyecto,
        0,
        dia.jornada as Jornada,
      );
      totalSugerido += monto;
      detalle.push({
        fecha: dia.fecha,
        rolDia: dia.rol_dia as RolDia,
        tipoTrabajo: "sin_trabajo",
        jornada: dia.jornada as Jornada,
        tipoProyecto: dia.tipo_proyecto as TipoProyecto,
        hectareas: null,
        clienteInforme: null,
        motivo: dia.descripcion as string,
        monto,
      });
      continue;
    }

    diasOficinaCount += 1;
    const monto = calcularPagoOficina(dia.rol_dia as RolDia, dia.jornada as Jornada);
    totalSugerido += monto;
    detalle.push({
      fecha: dia.fecha,
      rolDia: dia.rol_dia as RolDia,
      tipoTrabajo: "oficina",
      jornada: dia.jornada as Jornada,
      tipoProyecto: null,
      hectareas: null,
      clienteInforme: null,
      motivo: null,
      monto,
    });
  }

  // Como operador, el rol siempre es "operador"; como ayudante, siempre
  // "ayudante" -- son 2 campos distintos del mismo Informe de Campo
  // (nunca la misma persona en ambos a la vez), se infiere de cuál de
  // las 2 consultas trajo el informe, no de un campo aparte.
  const informesConRol: (InformeCampoFila & { rolDia: RolDia })[] = [
    ...(comoOperador ?? []).map((i) => ({ ...(i as InformeCampoFila), rolDia: "operador" as const })),
    ...(comoAyudante ?? []).map((i) => ({ ...(i as InformeCampoFila), rolDia: "ayudante" as const })),
  ];

  for (const informe of informesConRol) {
    diasProyecto += 1;
    const hectareasInforme = hectareasPorInforme.get(informe.id) ?? 0;
    if (!informe.tipo_proyecto) {
      // Informe todavía sin clasificar (Ingenio/Particular) -- no se
      // puede calcular, queda en 0 para que el jefe lo revise.
      detalle.push({
        fecha: informe.fecha,
        rolDia: informe.rolDia,
        tipoTrabajo: "proyecto",
        jornada: informe.jornada,
        tipoProyecto: null,
        hectareas: hectareasInforme,
        clienteInforme: informe.cliente,
        motivo: null,
        monto: 0,
      });
      continue;
    }
    hectareasProyecto += hectareasInforme;
    const monto = calcularPagoProyecto(informe.rolDia, informe.tipo_proyecto, hectareasInforme, informe.jornada);
    totalSugerido += monto;
    detalle.push({
      fecha: informe.fecha,
      rolDia: informe.rolDia,
      tipoTrabajo: "proyecto",
      jornada: informe.jornada,
      tipoProyecto: informe.tipo_proyecto,
      hectareas: hectareasInforme,
      clienteInforme: informe.cliente,
      motivo: null,
      monto,
    });
  }

  // Días adicionales (2do, 3er, etc.) de un Particular "Abierto" -- mismo
  // tratamiento que un Informe de Campo normal, una fila por día, nunca
  // se suman hectáreas entre días distintos.
  const diasConRol: (InformeCampoDiaFila & { rolDia: RolDia })[] = [
    ...(diasComoOperador ?? []).map((d) => ({
      ...(d as unknown as InformeCampoDiaFila),
      rolDia: "operador" as const,
    })),
    ...(diasComoAyudante ?? []).map((d) => ({
      ...(d as unknown as InformeCampoDiaFila),
      rolDia: "ayudante" as const,
    })),
  ];

  for (const dia of diasConRol) {
    diasProyecto += 1;
    const hectareasDia = hectareasPorDia.get(dia.id) ?? 0;
    const tipoProyectoDia = dia.informes_campo?.tipo_proyecto ?? null;
    const clienteDia = dia.informes_campo?.cliente ?? null;
    if (!tipoProyectoDia) {
      detalle.push({
        fecha: dia.fecha,
        rolDia: dia.rolDia,
        tipoTrabajo: "proyecto",
        jornada: dia.jornada,
        tipoProyecto: null,
        hectareas: hectareasDia,
        clienteInforme: clienteDia,
        motivo: null,
        monto: 0,
      });
      continue;
    }
    hectareasProyecto += hectareasDia;
    const monto = calcularPagoProyecto(dia.rolDia, tipoProyectoDia, hectareasDia, dia.jornada);
    totalSugerido += monto;
    detalle.push({
      fecha: dia.fecha,
      rolDia: dia.rolDia,
      tipoTrabajo: "proyecto",
      jornada: dia.jornada,
      tipoProyecto: tipoProyectoDia,
      hectareas: hectareasDia,
      clienteInforme: clienteDia,
      motivo: null,
      monto,
    });
  }

  detalle.sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    totalDias: diasOficinaCount + diasSinTrabajoCount + informesConRol.length + diasConRol.length,
    totalSugerido: Math.round(totalSugerido * 100) / 100,
    diasOficina: diasOficinaCount,
    diasProyecto,
    diasSinTrabajo: diasSinTrabajoCount,
    hectareasProyecto,
    detalle,
  };
}
