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

export type DatosProyecto = { cliente: string; hectareas: number };

// Vista previa en el formulario al elegir un Proyecto -- el servidor
// vuelve a calcular estos mismos valores al guardar (nunca se confía en lo
// que muestre esta vista previa), así que acá solo importa que coincida.
export async function obtenerDatosProyectoAction(proyectoId: string): Promise<DatosProyecto> {
  await requirePerfil();
  const supabase = await createClient();

  const { data: proyecto, error: errorProyecto } = await supabase
    .from("proyectos")
    .select("clientes ( nombre )")
    .eq("id", proyectoId)
    .maybeSingle();

  if (errorProyecto || !proyecto) throw new Error("No se pudo cargar el proyecto.");

  const { data: informesData } = await supabase
    .from("informes_campo")
    .select("informe_campo_parcelas ( hectareas )")
    .eq("proyecto_id", proyectoId);

  const hectareas = ((informesData ?? []) as unknown as { informe_campo_parcelas: { hectareas: number }[] | null }[])
    .reduce((s, informe) => s + (informe.informe_campo_parcelas ?? []).reduce((s2, p) => s2 + Number(p.hectareas), 0), 0);

  const clienteNombre = (proyecto as unknown as { clientes: { nombre: string } | null }).clientes?.nombre ?? "—";

  return { cliente: clienteNombre, hectareas: Math.round(hectareas * 100) / 100 };
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

// Mismo principio que se usaba para Planilla (ver historial de este
// archivo) pero para Caja Menuda: categoría "Viáticos", sin filtro de
// fecha (el Análisis de Proyecto ya no tiene un rango -- jala todo el
// historial del Cliente, igual que las Hectáreas jalan todos los Informes
// de Campo del Proyecto sin importar cuándo se hicieron), el Concepto
// relacionado con el nombre del proyecto (ver coincideConProyecto), y
// opcionalmente el Equipo de Campo (Operador + Ayudantes) = "Nombre" del
// movimiento (a quién se le entregó el dinero) -- debe ser alguno de ellos.
export async function buscarViaticosCajaMenudaAction(
  proyecto: string,
  equipo: string[],
): Promise<ResultadoBusquedaAuto> {
  await requirePerfil();
  const supabase = await createClient();
  let consulta = supabase.from("caja_gastos").select("concepto, monto").eq("categoria", "Viáticos");
  const nombresEquipo = equipo.map((n) => n.trim()).filter((n) => n !== "");
  if (nombresEquipo.length > 0) {
    consulta = consulta.in("nombre", nombresEquipo);
  }

  const { data, error } = await consulta;

  if (error) throw new Error(error.message || "No se pudo buscar en Caja Menuda.");

  const coincidencias = (data ?? []).filter((g) => coincideConProyecto(g.concepto ?? "", proyecto));
  return { total: coincidencias.reduce((s, g) => s + Number(g.monto), 0), cantidad: coincidencias.length };
}
