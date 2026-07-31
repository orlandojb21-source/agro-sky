"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { informeProyectoSchema, informeProyectoEditSchema } from "@/lib/validation/proyectos";
import type { ActionState } from "./types";

export async function crearInformeProyectoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let filas: unknown;
  let gastosOperativos: unknown;
  try {
    filas = JSON.parse(raw.filas || "[]");
    gastosOperativos = JSON.parse(raw.gastosOperativos || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const parsed = informeProyectoSchema.safeParse({
    proyecto: raw.proyecto,
    ubicacion: raw.ubicacion,
    hectareas: raw.hectareas,
    precio: raw.precio,
    total: raw.total,
    fechaDesde: raw.fechaDesde,
    fechaHasta: raw.fechaHasta,
    filas,
    gastosOperativos,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { data: informeId, error } = await supabase.rpc("crear_informe_proyecto", {
    p_proyecto: parsed.data.proyecto,
    p_ubicacion: parsed.data.ubicacion || null,
    p_hectareas: parsed.data.hectareas,
    p_precio: parsed.data.precio,
    p_total: parsed.data.total,
    p_fecha_desde: parsed.data.fechaDesde,
    p_fecha_hasta: parsed.data.fechaHasta,
    p_filas: parsed.data.filas.map((f) => ({
      drone: f.drone,
      hectareas: f.hectareas,
      precio: f.precio,
    })),
    p_gastos_operativos: parsed.data.gastosOperativos.map((b) => ({
      drone: b.drone,
      operador: b.operador || null,
      ayudantes: b.ayudantes,
      items: b.items.map((it) => ({
        categoria: it.categoria,
        cantidad: it.cantidad,
        precio: it.precio,
      })),
    })),
  });

  if (error) {
    return {
      error: error.message || "No se pudo guardar el informe. Intenta de nuevo.",
      values: raw,
    };
  }

  revalidatePath("/proyectos");
  redirect(`/proyectos/${informeId}`);
}

export async function editarInformeProyectoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let filas: unknown;
  let gastosOperativos: unknown;
  try {
    filas = JSON.parse(raw.filas || "[]");
    gastosOperativos = JSON.parse(raw.gastosOperativos || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const parsed = informeProyectoEditSchema.safeParse({
    id: raw.id,
    proyecto: raw.proyecto,
    ubicacion: raw.ubicacion,
    hectareas: raw.hectareas,
    precio: raw.precio,
    total: raw.total,
    fechaDesde: raw.fechaDesde,
    fechaHasta: raw.fechaHasta,
    filas,
    gastosOperativos,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("editar_informe_proyecto", {
    p_informe_id: parsed.data.id,
    p_proyecto: parsed.data.proyecto,
    p_ubicacion: parsed.data.ubicacion || null,
    p_hectareas: parsed.data.hectareas,
    p_precio: parsed.data.precio,
    p_total: parsed.data.total,
    p_fecha_desde: parsed.data.fechaDesde,
    p_fecha_hasta: parsed.data.fechaHasta,
    p_filas: parsed.data.filas.map((f) => ({
      drone: f.drone,
      hectareas: f.hectareas,
      precio: f.precio,
    })),
    p_gastos_operativos: parsed.data.gastosOperativos.map((b) => ({
      drone: b.drone,
      operador: b.operador || null,
      ayudantes: b.ayudantes,
      items: b.items.map((it) => ({
        categoria: it.categoria,
        cantidad: it.cantidad,
        precio: it.precio,
      })),
    })),
  });

  if (error) {
    return {
      error: error.message || "No se pudo actualizar el informe. Intenta de nuevo.",
      values: raw,
    };
  }

  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${parsed.data.id}`);
  redirect(`/proyectos/${parsed.data.id}`);
}

export async function eliminarInformeProyectoAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_informe_proyecto", { p_informe_id: id });
  if (error) throw new Error(error.message || "No se pudo eliminar el informe.");
  revalidatePath("/proyectos");
}

export type ResultadoBusquedaAuto = { total: number; cantidad: number };

// El nombre del proyecto suele traer un descriptor de semana entre
// paréntesis (ej. "Ingenio Santa Rosa (Semana 8 Granulado)") -- el "nombre
// central" es la parte antes del paréntesis, el cliente en sí.
function nombreCentralProyecto(proyecto: string): string {
  const indice = proyecto.indexOf("(");
  return (indice === -1 ? proyecto : proyecto.slice(0, indice)).trim().toLowerCase();
}

// Compara un texto libre (Descripción de un pago de planilla, o Concepto de
// un movimiento de Caja Menuda) contra el nombre del proyecto del informe,
// de forma flexible en cualquier dirección: puede que el texto libre sea
// solo el nombre del cliente, que el nombre del proyecto completo aparezca
// dentro del texto libre, o que el texto libre mezcle el nombre del cliente
// con otras palabras (ej. "proyecto Ingenio Santa Rosa - comida") -- en ese
// último caso ninguno de los dos contiene por completo al otro, así que se
// busca el nombre central del proyecto (sin el descriptor de semana) dentro
// del texto libre.
function coincideConProyecto(textoLibre: string, proyecto: string): boolean {
  const texto = textoLibre.trim().toLowerCase();
  if (texto === "") return false;
  const proyectoCompleto = proyecto.trim().toLowerCase();
  const central = nombreCentralProyecto(proyecto);
  return (
    proyectoCompleto.includes(texto) ||
    texto.includes(proyectoCompleto) ||
    (central !== "" && texto.includes(central))
  );
}

// Busca en tiempo real (no en una lista cargada al abrir la página) para que
// funcione sin importar si el pago de planilla se registró antes o después
// de abrir el formulario del informe. Criterios: tipo de trabajo
// "Proyecto", fecha dentro de la semana, Descripción relacionada con el
// nombre del proyecto (ver coincideConProyecto), y opcionalmente el
// Equipo de Campo (Operador + Ayudantes) -- si se dio, el colaborador del
// pago debe ser alguno de ellos (no solo el Operador, pedido explícito del
// usuario: el gasto lo hace todo el equipo, no una sola persona).
export async function buscarPagosPlanillaProyectoAction(
  proyecto: string,
  fechaDesde: string,
  fechaHasta: string,
  equipo: string[],
): Promise<ResultadoBusquedaAuto> {
  await requirePerfil();
  const supabase = await createClient();
  let consulta = supabase
    .from("planilla_pagos")
    .select("descripcion, monto")
    .eq("tipo_trabajo", "proyecto")
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);
  const nombresEquipo = equipo.map((n) => n.trim()).filter((n) => n !== "");
  if (nombresEquipo.length > 0) {
    consulta = consulta.in("colaborador", nombresEquipo);
  }

  const { data, error } = await consulta;

  if (error) throw new Error(error.message || "No se pudo buscar en Planilla.");

  const coincidencias = (data ?? []).filter((p) => coincideConProyecto(p.descripcion ?? "", proyecto));
  return { total: coincidencias.reduce((s, p) => s + Number(p.monto), 0), cantidad: coincidencias.length };
}

// Mismo principio que Planilla pero para Caja Menuda: categoría "Viáticos",
// fecha dentro de la semana, el Concepto relacionado con el nombre del
// proyecto (ver coincideConProyecto), y opcionalmente el Equipo de Campo
// (Operador + Ayudantes) = "Nombre" del movimiento (a quién se le entregó
// el dinero) -- debe ser alguno de ellos.
export async function buscarViaticosCajaMenudaAction(
  proyecto: string,
  fechaDesde: string,
  fechaHasta: string,
  equipo: string[],
): Promise<ResultadoBusquedaAuto> {
  await requirePerfil();
  const supabase = await createClient();
  let consulta = supabase
    .from("caja_gastos")
    .select("concepto, monto")
    .eq("categoria", "Viáticos")
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);
  const nombresEquipo = equipo.map((n) => n.trim()).filter((n) => n !== "");
  if (nombresEquipo.length > 0) {
    consulta = consulta.in("nombre", nombresEquipo);
  }

  const { data, error } = await consulta;

  if (error) throw new Error(error.message || "No se pudo buscar en Caja Menuda.");

  const coincidencias = (data ?? []).filter((g) => coincideConProyecto(g.concepto ?? "", proyecto));
  return { total: coincidencias.reduce((s, g) => s + Number(g.monto), 0), cantidad: coincidencias.length };
}
