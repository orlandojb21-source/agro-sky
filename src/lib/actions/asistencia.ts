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
  informe_campo_parcelas: { hectareas: number }[] | null;
};

// Se llama directo desde el formulario de Pago (no vinculado a un <form>,
// igual que buscarViaticosCajaMenudaAction en lib/actions/proyectos.ts)
// para sugerirle al jefe/soporte un monto de quincena, calculado con las
// tarifas de lib/calculoIncentivos.ts -- el resultado PRE-LLENA el campo
// de monto, pero sigue siendo editable a mano (nunca se guarda solo).
//
// Cada Informe de Campo tiene su propia contabilidad de hectáreas -- si
// una persona aparece en más de un informe el mismo día (ej. un proyecto
// en la mañana y otro distinto en la tarde), NUNCA se suman las hectáreas
// entre esos informes. Cada uno se calcula por separado con su propio
// tipo de proyecto y sus propias hectáreas, y los montos resultantes se
// suman al final.
export async function obtenerResumenAsistenciaAction(
  colaborador: string,
  fechaDesde: string,
  fechaHasta: string,
): Promise<ResumenAsistencia> {
  await requirePerfil();
  const supabase = await createClient();

  const { data: dias, error } = await supabase
    .from("planilla_asistencia")
    .select("fecha, rol_dia, tipo_trabajo, jornada")
    .eq("colaborador", colaborador)
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);

  if (error) throw new Error(error.message || "No se pudo consultar la asistencia.");

  const diasProyectoFechas = [...new Set((dias ?? []).filter((d) => d.tipo_trabajo === "proyecto").map((d) => d.fecha))];

  const informesPorFecha = new Map<string, InformeCampoFila[]>();
  if (diasProyectoFechas.length > 0) {
    const [{ data: comoOperador }, { data: comoAyudante }] = await Promise.all([
      supabase
        .from("informes_campo")
        .select("fecha, cliente, tipo_proyecto, informe_campo_parcelas ( hectareas )")
        .eq("operador", colaborador)
        .in("fecha", diasProyectoFechas),
      supabase
        .from("informes_campo")
        .select("fecha, cliente, tipo_proyecto, informe_campo_parcelas ( hectareas )")
        .contains("ayudantes", [colaborador])
        .in("fecha", diasProyectoFechas),
    ]);
    for (const informe of [...(comoOperador ?? []), ...(comoAyudante ?? [])] as InformeCampoFila[]) {
      const lista = informesPorFecha.get(informe.fecha) ?? [];
      lista.push(informe);
      informesPorFecha.set(informe.fecha, lista);
    }
  }

  let totalSugerido = 0;
  let diasOficina = 0;
  let diasProyecto = 0;
  let hectareasProyecto = 0;
  const detalle: DetalleDiaAsistencia[] = [];

  for (const dia of dias ?? []) {
    if (dia.tipo_trabajo === "oficina") {
      diasOficina += 1;
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
      continue;
    }

    diasProyecto += 1;
    const informes = informesPorFecha.get(dia.fecha) ?? [];

    if (informes.length === 0) {
      // Día de Proyecto sin ningún Informe de Campo asociado -- no hay de
      // dónde sacar hectáreas, queda en 0 para que el jefe lo revise.
      detalle.push({
        fecha: dia.fecha,
        rolDia: dia.rol_dia as RolDia,
        tipoTrabajo: "proyecto",
        jornada: null,
        tipoProyecto: null,
        hectareas: null,
        clienteInforme: null,
        monto: 0,
      });
      continue;
    }

    for (const informe of informes) {
      const hectareasInforme = (informe.informe_campo_parcelas ?? []).reduce(
        (s, p) => s + Number(p.hectareas),
        0,
      );
      if (!informe.tipo_proyecto) {
        // Informe todavía sin clasificar (Ingenio/Particular) -- no se
        // puede calcular, queda en 0 para que el jefe lo revise.
        detalle.push({
          fecha: dia.fecha,
          rolDia: dia.rol_dia as RolDia,
          tipoTrabajo: "proyecto",
          jornada: null,
          tipoProyecto: null,
          hectareas: hectareasInforme,
          clienteInforme: informe.cliente,
          monto: 0,
        });
        continue;
      }
      hectareasProyecto += hectareasInforme;
      const monto = calcularPagoProyecto(dia.rol_dia as RolDia, informe.tipo_proyecto, hectareasInforme);
      totalSugerido += monto;
      detalle.push({
        fecha: dia.fecha,
        rolDia: dia.rol_dia as RolDia,
        tipoTrabajo: "proyecto",
        jornada: null,
        tipoProyecto: informe.tipo_proyecto,
        hectareas: hectareasInforme,
        clienteInforme: informe.cliente,
        monto,
      });
    }
  }

  detalle.sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    totalDias: dias?.length ?? 0,
    totalSugerido: Math.round(totalSugerido * 100) / 100,
    diasOficina,
    diasProyecto,
    hectareasProyecto,
    detalle,
  };
}
