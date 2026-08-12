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
// de Oficina siempre es 1 sola fila. Un día de Proyecto sin ningún
// Informe de Campo asociado aparece con monto 0 para que el jefe lo note
// y lo complete a mano.
export type DetalleDiaAsistencia = {
  fecha: string;
  rolDia: RolDia;
  tipoTrabajo: "oficina" | "proyecto";
  jornada: Jornada | null;
  tipoProyecto: TipoProyecto | null;
  hectareas: number | null;
  clienteInforme: string | null;
  monto: number;
};

export type ResumenAsistencia = {
  totalDias: number;
  totalSugerido: number;
  diasOficina: number;
  diasProyecto: number;
  hectareasProyecto: number;
  detalle: DetalleDiaAsistencia[];
};

type InformeCampoFila = {
  fecha: string;
  cliente: string;
  tipo_proyecto: TipoProyecto | null;
  jornada: Jornada;
  informe_campo_parcelas: { hectareas: number }[] | null;
};

// Se llama directo desde el formulario de Pago (no vinculado a un <form>,
// igual que buscarViaticosCajaMenudaAction en lib/actions/proyectos.ts)
// para sugerirle al jefe/soporte un monto de quincena, calculado con las
// tarifas de lib/calculoIncentivos.ts -- el resultado PRE-LLENA el campo
// de monto, pero sigue siendo editable a mano (nunca se guarda solo).
//
// Desde 2026-08-10: Asistencia solo registra Oficina -- el Informe de
// Campo es la única fuente para Proyecto (Ingenio Santa Rosa/Particular),
// ya no hace falta cruzar con una fila de planilla_asistencia tipo
// "proyecto" (que ya no se puede crear desde el formulario, ver
// AsistenciaForm.tsx). Cada Informe de Campo tiene su propia contabilidad
// de hectáreas -- si una persona aparece en más de un informe el mismo
// día, NUNCA se suman las hectáreas entre esos informes, cada uno se
// calcula por separado con su propio tipo de proyecto, jornada y
// hectáreas, y los montos resultantes se suman al final.
export async function obtenerResumenAsistenciaAction(
  colaborador: string,
  fechaDesde: string,
  fechaHasta: string,
): Promise<ResumenAsistencia> {
  await requirePerfil();
  const supabase = await createClient();

  const { data: diasOficina, error } = await supabase
    .from("planilla_asistencia")
    .select("fecha, rol_dia, jornada")
    .eq("colaborador", colaborador)
    .eq("tipo_trabajo", "oficina")
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);

  if (error) throw new Error(error.message || "No se pudo consultar la asistencia.");

  const [{ data: comoOperador, error: errorOperador }, { data: comoAyudante, error: errorAyudante }] =
    await Promise.all([
      supabase
        .from("informes_campo")
        .select("fecha, cliente, tipo_proyecto, jornada, informe_campo_parcelas ( hectareas )")
        .eq("operador", colaborador)
        .gte("fecha", fechaDesde)
        .lte("fecha", fechaHasta),
      supabase
        .from("informes_campo")
        .select("fecha, cliente, tipo_proyecto, jornada, informe_campo_parcelas ( hectareas )")
        .contains("ayudantes", [colaborador])
        .gte("fecha", fechaDesde)
        .lte("fecha", fechaHasta),
    ]);

  if (errorOperador || errorAyudante) {
    throw new Error("No se pudo consultar los Informes de Campo.");
  }

  let totalSugerido = 0;
  let diasOficinaCount = 0;
  let diasProyecto = 0;
  let hectareasProyecto = 0;
  const detalle: DetalleDiaAsistencia[] = [];

  for (const dia of diasOficina ?? []) {
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
    const hectareasInforme = (informe.informe_campo_parcelas ?? []).reduce(
      (s, p) => s + Number(p.hectareas),
      0,
    );
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
      monto,
    });
  }

  detalle.sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    totalDias: diasOficinaCount + informesConRol.length,
    totalSugerido: Math.round(totalSugerido * 100) / 100,
    diasOficina: diasOficinaCount,
    diasProyecto,
    hectareasProyecto,
    detalle,
  };
}
