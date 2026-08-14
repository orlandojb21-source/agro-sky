"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil, requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { informeProyectoSchema, informeProyectoEditSchema } from "@/lib/validation/proyectos";
import type { ActionState } from "./types";

export async function crearInformeProyectoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("informes");
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
    proyectoId: raw.proyectoId,
    ubicacion: raw.ubicacion,
    precio: raw.precio,
    filas,
    gastosOperativos,
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
  try {
    filas = JSON.parse(raw.filas || "[]");
    gastosOperativos = JSON.parse(raw.gastosOperativos || "[]");
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
export type DatosProyecto = {
  cliente: string;
  hectareas: number;
  filas: FilaProyectoPreview[];
  equipos: EquipoProyectoPreview[];
};

type FilaInformeCampo = {
  id: string;
  modelo_drone: string;
  operador: string;
  ayudantes: string[] | null;
  informe_campo_parcelas: { hectareas: number }[] | null;
};

// Vista previa en el formulario al elegir un Proyecto -- el servidor
// vuelve a calcular estos mismos valores al guardar (nunca se confía en lo
// que muestre esta vista previa), así que acá solo importa que coincida.
// - filas: una por cada Informe de Campo del Proyecto (mismo Drone que
//   aparezca en 2 Informes de Campo distintos sale 2 veces).
// - equipos: uno por cada combinación distinta de Operador+Ayudantes que
//   aparezca en esos Informes de Campo, con Viáticos (Caja Menuda) y
//   Planilla ya sumados si hay movimientos/pagos que coincidan con el
//   Cliente y con alguien del equipo -- sigue siendo editable a mano.
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

  const [{ data: informesData }, { data: viaticosData }, { data: planillaData }] = await Promise.all([
    supabase
      .from("informes_campo")
      .select("id, modelo_drone, operador, ayudantes, informe_campo_parcelas ( hectareas )")
      .eq("proyecto_id", proyectoId)
      .order("fecha")
      .order("creado_en"),
    supabase.from("caja_gastos").select("concepto, monto, nombre").eq("categoria", "Viáticos"),
    supabase.from("planilla_pagos").select("descripcion, monto, colaborador").eq("tipo_trabajo", "proyecto"),
  ]);

  const informes = (informesData ?? []) as unknown as FilaInformeCampo[];

  const filas: FilaProyectoPreview[] = informes.map((informe) => ({
    informeCampoId: informe.id,
    drone: informe.modelo_drone,
    hectareas:
      Math.round(
        (informe.informe_campo_parcelas ?? []).reduce((s, p) => s + Number(p.hectareas), 0) * 100,
      ) / 100,
  }));

  const hectareas = filas.reduce((s, f) => s + f.hectareas, 0);

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
    const planillaCoincidencias = (planillaData ?? []).filter(
      (g) => nombresEquipo.includes(g.colaborador) && coincideConProyecto(g.descripcion ?? "", clienteNombre),
    );

    return {
      key,
      operador,
      ayudantes,
      viaticos: {
        cantidad: viaticosCoincidencias.length,
        total: Math.round(viaticosCoincidencias.reduce((s, g) => s + Number(g.monto), 0) * 100) / 100,
      },
      planilla: {
        cantidad: planillaCoincidencias.length,
        total: Math.round(planillaCoincidencias.reduce((s, g) => s + Number(g.monto), 0) * 100) / 100,
      },
    };
  });

  return { cliente: clienteNombre, hectareas: Math.round(hectareas * 100) / 100, filas, equipos };
}
