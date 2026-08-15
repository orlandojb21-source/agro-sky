"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil, requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { informeProyectoSchema, informeProyectoEditSchema } from "@/lib/validation/proyectos";
import { calcularPagoProyecto, type Jornada, type TipoProyecto } from "@/lib/calculoIncentivos";
import { mapearGastosProyecto, type GastoProyectoRegistrado } from "@/lib/proyectoGastos";
import type { ActionState } from "./types";

type FilaInformeCampo = {
  id: string;
  fecha: string;
  modelo_drone: string;
  operador: string;
  ayudantes: string[] | null;
  tipo_proyecto: TipoProyecto | null;
  jornada: Jornada;
  informe_campo_parcelas: { hectareas: number }[] | null;
};

type EntradaPlanilla = { informeCampoId: string; colaborador: string; fecha: string; monto: number };

// Cuánto le corresponde a cada trabajador (Operador y cada Ayudante) por
// cada Informe de Campo -- misma tarifa que "Calcular pago sugerido"
// (lib/calculoIncentivos.ts), nunca se suman las hectáreas entre informes
// distintos. Un informe sin tipo_proyecto clasificado todavía no se puede
// calcular, se salta. Solo alimenta la vista previa (obtenerDatosProyectoAction)
// -- el Monto que de verdad se guarda al crear/editar es el que traiga el
// navegador (ver p_planilla_detalle), por si el jefe lo ajustó a mano.
function calcularDetallePlanilla(informes: FilaInformeCampo[]): EntradaPlanilla[] {
  const entradas: EntradaPlanilla[] = [];
  for (const informe of informes) {
    if (!informe.tipo_proyecto) continue;
    const hectareasInforme = (informe.informe_campo_parcelas ?? []).reduce((s, p) => s + Number(p.hectareas), 0);
    const operador = informe.operador.trim();
    const ayudantes = (informe.ayudantes ?? []).map((a) => a.trim()).filter((a) => a !== "");

    entradas.push({
      informeCampoId: informe.id,
      colaborador: operador,
      fecha: informe.fecha,
      monto: calcularPagoProyecto("operador", informe.tipo_proyecto, hectareasInforme, informe.jornada),
    });
    for (const ayudante of ayudantes) {
      entradas.push({
        informeCampoId: informe.id,
        colaborador: ayudante,
        fecha: informe.fecha,
        monto: calcularPagoProyecto("ayudante", informe.tipo_proyecto, hectareasInforme, informe.jornada),
      });
    }
  }
  return entradas;
}

// Trae los Informes de Campo del Proyecto con todo lo necesario para
// calcular Hectáreas/Drone/Planilla -- una sola consulta, reusada por el
// preview (obtenerDatosProyectoAction) y por crear/editar (para no
// confiar en lo que mande el navegador).
async function obtenerInformesDelProyecto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proyectoId: string,
): Promise<FilaInformeCampo[]> {
  const { data } = await supabase
    .from("informes_campo")
    .select("id, fecha, modelo_drone, operador, ayudantes, tipo_proyecto, jornada, informe_campo_parcelas ( hectareas )")
    .eq("proyecto_id", proyectoId)
    .order("fecha")
    .order("creado_en");
  return (data ?? []) as unknown as FilaInformeCampo[];
}

export async function crearInformeProyectoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("informes");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let filas: unknown;
  let gastosOperativos: unknown;
  let planillaDetalle: unknown;
  try {
    filas = JSON.parse(raw.filas || "[]");
    gastosOperativos = JSON.parse(raw.gastosOperativos || "[]");
    planillaDetalle = JSON.parse(raw.planillaDetalle || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const parsed = informeProyectoSchema.safeParse({
    proyectoId: raw.proyectoId,
    ubicacion: raw.ubicacion,
    precio: raw.precio,
    filas,
    gastosOperativos,
    planillaDetalle,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  const { data: informeId, error } = await supabase.rpc("crear_informe_proyecto", {
    p_proyecto_id: parsed.data.proyectoId,
    p_ubicacion: parsed.data.ubicacion || null,
    p_precio: parsed.data.precio,
    p_filas: parsed.data.filas.map((f) => ({
      informeCampoId: f.informeCampoId,
      precio: f.precio,
    })),
    p_gastos_operativos: parsed.data.gastosOperativos.map((b) => ({
      equipoKey: b.equipoKey,
      items: b.items.map((it) => ({
        categoria: it.categoria,
        cantidad: it.cantidad,
        precio: it.precio,
      })),
    })),
    p_planilla_detalle: parsed.data.planillaDetalle.map((d) => ({
      informeCampoId: d.informeCampoId,
      colaborador: d.colaborador,
      monto: d.monto,
    })),
  });

  if (error) {
    return {
      error: error.message || "No se pudo guardar el informe. Intenta de nuevo.",
      values: raw,
    };
  }

  revalidatePath("/informes/proyecto");
  redirect(`/informes/proyecto/${informeId}`);
}

export async function editarInformeProyectoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("informes");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let filas: unknown;
  let gastosOperativos: unknown;
  let planillaDetalle: unknown;
  try {
    filas = JSON.parse(raw.filas || "[]");
    gastosOperativos = JSON.parse(raw.gastosOperativos || "[]");
    planillaDetalle = JSON.parse(raw.planillaDetalle || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const parsed = informeProyectoEditSchema.safeParse({
    id: raw.id,
    proyectoId: raw.proyectoId,
    ubicacion: raw.ubicacion,
    precio: raw.precio,
    filas,
    gastosOperativos,
    planillaDetalle,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("editar_informe_proyecto", {
    p_informe_id: parsed.data.id,
    p_proyecto_id: parsed.data.proyectoId,
    p_ubicacion: parsed.data.ubicacion || null,
    p_precio: parsed.data.precio,
    p_filas: parsed.data.filas.map((f) => ({
      informeCampoId: f.informeCampoId,
      precio: f.precio,
    })),
    p_gastos_operativos: parsed.data.gastosOperativos.map((b) => ({
      equipoKey: b.equipoKey,
      items: b.items.map((it) => ({
        categoria: it.categoria,
        cantidad: it.cantidad,
        precio: it.precio,
      })),
    })),
    p_planilla_detalle: parsed.data.planillaDetalle.map((d) => ({
      informeCampoId: d.informeCampoId,
      colaborador: d.colaborador,
      monto: d.monto,
    })),
  });

  if (error) {
    return {
      error: error.message || "No se pudo actualizar el informe. Intenta de nuevo.",
      values: raw,
    };
  }

  revalidatePath("/informes/proyecto");
  revalidatePath(`/informes/proyecto/${parsed.data.id}`);
  redirect(`/informes/proyecto/${parsed.data.id}`);
}

export async function eliminarInformeProyectoAction(id: string) {
  await requireWrite("informes");
  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_informe_proyecto", { p_informe_id: id });
  if (error) throw new Error(error.message || "No se pudo eliminar el informe.");
  revalidatePath("/informes/proyecto");
}

// El nombre del proyecto (o del Cliente) suele traer un descriptor extra
// entre paréntesis (ej. "Ingenio Santa Rosa (Semana 8 Granulado)") -- el
// "nombre central" es la parte antes del paréntesis.
function nombreCentral(texto: string): string {
  const indice = texto.indexOf("(");
  return (indice === -1 ? texto : texto.slice(0, indice)).trim().toLowerCase();
}

// Compara un texto libre (Descripción de un pago de planilla, o Concepto de
// un movimiento de Caja Menuda) contra el nombre del Cliente del Proyecto,
// de forma flexible en cualquier dirección: puede que el texto libre sea
// solo el nombre del cliente, que el nombre completo aparezca dentro del
// texto libre, o que el texto libre mezcle el nombre del cliente con otras
// palabras (ej. "Ingenio Santa Rosa - comida") -- en ese último caso
// ninguno de los dos contiene por completo al otro, así que se busca el
// nombre central (sin el descriptor entre paréntesis) dentro del texto.
function coincideConProyecto(textoLibre: string, referencia: string): boolean {
  const texto = textoLibre.trim().toLowerCase();
  if (texto === "") return false;
  const referenciaCompleta = referencia.trim().toLowerCase();
  const central = nombreCentral(referencia);
  return (
    referenciaCompleta.includes(texto) ||
    texto.includes(referenciaCompleta) ||
    (central !== "" && texto.includes(central))
  );
}

// Mismo formato en el navegador (ProyectoInformeForm.tsx) y acá, para que
// cada bloque de Gastos Operativos se pueda emparejar con su equipoKey al
// guardar (ver crear_informe_proyecto/editar_informe_proyecto).
function claveEquipo(operador: string, ayudantes: string[]): string {
  const ayudantesOrdenados = ayudantes
    .map((a) => a.trim())
    .filter((a) => a !== "")
    .sort();
  return `${operador.trim()}||${ayudantesOrdenados.join(",")}`;
}

export type FilaProyectoPreview = { informeCampoId: string; drone: string; hectareas: number };
export type BusquedaAuto = { cantidad: number; total: number };
export type EquipoProyectoPreview = {
  key: string;
  operador: string;
  ayudantes: string[];
  viaticos: BusquedaAuto;
  planilla: BusquedaAuto;
};
export type DiaPlanillaTrabajador = { informeCampoId: string; fecha: string; monto: number };
export type PlanillaTrabajadorPreview = { colaborador: string; dias: DiaPlanillaTrabajador[]; total: number };
export type DatosProyecto = {
  cliente: string;
  hectareas: number;
  filas: FilaProyectoPreview[];
  equipos: EquipoProyectoPreview[];
  detallePlanilla: PlanillaTrabajadorPreview[];
  gastosProyecto: GastoProyectoRegistrado[];
};

// Vista previa en el formulario al elegir un Proyecto. El set de filas/
// equipos/días (CUÁLES existen) el servidor lo vuelve a derivar de los
// Informes de Campo al guardar, nunca se confía en eso; los MONTOS
// (Precio de cada fila, Cantidad/Precio de Gastos Operativos, Monto de
// cada día de Planilla) sí viajan tal cual desde el navegador -- son
// sugerencias editables, no valores fijos.
// - filas: una por cada Informe de Campo del Proyecto (mismo Drone que
//   aparezca en 2 Informes de Campo distintos sale 2 veces).
// - equipos: uno por cada combinación distinta de Operador+Ayudantes que
//   aparezca en esos Informes de Campo, con Viáticos (Caja Menuda) ya
//   sumados si hay movimientos que coincidan con el Cliente y con alguien
//   del equipo, y Planilla calculada directo con las mismas tarifas que
//   "Calcular pago sugerido" (lib/calculoIncentivos.ts) -- no depende de
//   que ya exista un Pago registrado, el jefe puede no haber corrido esa
//   quincena todavía.
// - detallePlanilla: la misma Planilla sugerida, pero desglosada por
//   trabajador individual y por día (no por equipo) -- ver
//   calcularDetallePlanilla. Cada día es editable a mano por separado.
// - gastosProyecto: gastos de Caja Menuda/Compras que ya traían este
//   Proyecto asociado (ver mapearGastosProyecto) -- de solo lectura, no
//   se encajan en los bloques por equipo ni se guardan aparte.
export async function obtenerDatosProyectoAction(proyectoId: string): Promise<DatosProyecto> {
  await requirePerfil();
  const supabase = await createClient();

  const { data: proyecto, error: errorProyecto } = await supabase
    .from("proyectos")
    .select("clientes ( nombre )")
    .eq("id", proyectoId)
    .maybeSingle();

  if (errorProyecto || !proyecto) throw new Error("No se pudo cargar el proyecto.");

  const clienteNombre = (proyecto as unknown as { clientes: { nombre: string } | null }).clientes?.nombre ?? "—";

  const [informes, { data: viaticosData }, { data: cajaGastosProyecto }, { data: gastosComprasProyecto }] =
    await Promise.all([
      obtenerInformesDelProyecto(supabase, proyectoId),
      supabase.from("caja_gastos").select("concepto, monto, nombre").eq("categoria", "Viáticos"),
      supabase
        .from("caja_gastos")
        .select("id, fecha, categoria, monto, concepto")
        .eq("proyecto_id", proyectoId)
        .order("fecha"),
      supabase
        .from("gastos")
        .select("id, fecha, categoria, categoria_otro, monto, descripcion")
        .eq("proyecto_id", proyectoId)
        .order("fecha"),
    ]);

  const filas: FilaProyectoPreview[] = informes.map((informe) => ({
    informeCampoId: informe.id,
    drone: informe.modelo_drone,
    hectareas:
      Math.round(
        (informe.informe_campo_parcelas ?? []).reduce((s, p) => s + Number(p.hectareas), 0) * 100,
      ) / 100,
  }));

  const hectareas = filas.reduce((s, f) => s + f.hectareas, 0);

  const planillaEntradas = calcularDetallePlanilla(informes);

  const equiposMap = new Map<string, { operador: string; ayudantes: string[] }>();
  for (const informe of informes) {
    const operador = informe.operador.trim();
    const ayudantes = (informe.ayudantes ?? []).map((a) => a.trim()).filter((a) => a !== "");
    const key = claveEquipo(operador, ayudantes);
    if (!equiposMap.has(key)) equiposMap.set(key, { operador, ayudantes });
  }

  const equipos: EquipoProyectoPreview[] = Array.from(equiposMap.entries()).map(([key, { operador, ayudantes }]) => {
    const nombresEquipo = [operador, ...ayudantes];

    const viaticosCoincidencias = (viaticosData ?? []).filter((g) => {
      if (g.nombre && !nombresEquipo.includes(g.nombre)) return false;
      return coincideConProyecto(g.concepto ?? "", clienteNombre);
    });

    const entradasEquipo = planillaEntradas.filter((e) => nombresEquipo.includes(e.colaborador));
    const informesConPlanilla = new Set(entradasEquipo.map((e) => e.informeCampoId));

    return {
      key,
      operador,
      ayudantes,
      viaticos: {
        cantidad: viaticosCoincidencias.length,
        total: Math.round(viaticosCoincidencias.reduce((s, g) => s + Number(g.monto), 0) * 100) / 100,
      },
      planilla: {
        cantidad: informesConPlanilla.size,
        total: Math.round(entradasEquipo.reduce((s, e) => s + e.monto, 0) * 100) / 100,
      },
    };
  });

  const detallePorTrabajador = new Map<string, DiaPlanillaTrabajador[]>();
  for (const entrada of planillaEntradas) {
    const dias = detallePorTrabajador.get(entrada.colaborador) ?? [];
    dias.push({ informeCampoId: entrada.informeCampoId, fecha: entrada.fecha, monto: entrada.monto });
    detallePorTrabajador.set(entrada.colaborador, dias);
  }
  const detallePlanilla: PlanillaTrabajadorPreview[] = Array.from(detallePorTrabajador.entries())
    .map(([colaborador, dias]) => ({
      colaborador,
      dias,
      total: Math.round(dias.reduce((s, d) => s + d.monto, 0) * 100) / 100,
    }))
    .sort((a, b) => a.colaborador.localeCompare(b.colaborador));

  const gastosProyecto = mapearGastosProyecto(
    (cajaGastosProyecto ?? []) as {
      id: string;
      fecha: string;
      categoria: string | null;
      monto: number;
      concepto: string | null;
    }[],
    (gastosComprasProyecto ?? []) as {
      id: string;
      fecha: string;
      categoria: string;
      categoria_otro: string | null;
      monto: number;
      descripcion: string | null;
    }[],
  );

  return {
    cliente: clienteNombre,
    hectareas: Math.round(hectareas * 100) / 100,
    filas,
    equipos,
    detallePlanilla,
    gastosProyecto,
  };
}
