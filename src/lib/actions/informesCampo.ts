"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { informeCampoSchema, informeCampoEditSchema } from "@/lib/validation/informesCampo";
import { fechaPermitida, MENSAJE_FECHA_NO_PERMITIDA, MENSAJE_REGISTRO_FECHA_VIEJA } from "@/lib/fechaRestriccion";
import { esSoporteOJefe } from "@/lib/roles";
import { eliminarImagenInformeCampoAction } from "./informeCampoImagen";
import type { ActionState } from "./types";

// El Proyecto elegido es la fuente real de verdad de cliente/tipo_proyecto
// -- nunca se confía en lo que mande el navegador para esos 2 campos
// (mismo principio que crear_venta_interna nunca confía en totales
// calculados en el cliente). Se usa tanto al crear como al editar, y
// también desde informeCampoOffline.ts (sincronización sin conexión).
export async function resolverProyecto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proyectoId: string,
): Promise<{ cliente: string; tipoProyecto: "ingenio_santa_rosa" | "particular" } | null> {
  const { data } = await supabase
    .from("proyectos")
    .select("tipo_proyecto, clientes ( nombre )")
    .eq("id", proyectoId)
    .maybeSingle();
  const clienteNombre = (data?.clientes as unknown as { nombre: string } | null)?.nombre;
  if (!data || !clienteNombre) return null;
  return { cliente: clienteNombre, tipoProyecto: data.tipo_proyecto as "ingenio_santa_rosa" | "particular" };
}

export async function crearInformeCampoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Campo SÍ puede crear un Informe de Campo (a diferencia de editar/
  // eliminar, ver más abajo) -- pedido explícito del usuario, 2026-08-04.
  const perfil = await requireWrite("informes");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let ayudantes: unknown;
  let parcelas: unknown;
  let productos: unknown;
  let imagenes: unknown;
  try {
    ayudantes = JSON.parse(raw.ayudantes || "[]");
    parcelas = JSON.parse(raw.parcelas || "[]");
    productos = JSON.parse(raw.productos || "[]");
    imagenes = JSON.parse(raw.imagenes || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const supabase = await createClient();

  const proyecto = await resolverProyecto(supabase, raw.proyectoId);
  if (!proyecto) {
    return { error: "El proyecto seleccionado ya no existe.", values: raw };
  }

  const parsed = informeCampoSchema.safeParse({
    cliente: proyecto.cliente,
    tipoProyecto: proyecto.tipoProyecto,
    proyectoId: raw.proyectoId,
    fecha: raw.fecha,
    finca: raw.finca,
    horaInicio: raw.horaInicio,
    horaFin: raw.horaFin,
    meteorologia: raw.meteorologia,
    tipoAplicacion: raw.tipoAplicacion,
    modeloDrone: raw.modeloDrone,
    dosisPorHectarea: raw.dosisPorHectarea,
    jornada: raw.jornada,
    operador: raw.operador,
    ayudantes,
    firmaAgroRuta: raw.firmaAgroRuta,
    nombreFirmaAgro: raw.nombreFirmaAgro,
    firmaClienteRuta: raw.firmaClienteRuta,
    nombreFirmaCliente: raw.nombreFirmaCliente,
    parcelas,
    productos,
    imagenes,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
    return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
  }

  const { data: informeId, error } = await supabase.rpc("crear_informe_campo", {
    p_cliente: parsed.data.cliente,
    p_fecha: parsed.data.fecha,
    p_finca: parsed.data.finca,
    p_hora_inicio: parsed.data.horaInicio,
    p_hora_fin: parsed.data.horaFin,
    p_meteorologia: parsed.data.meteorologia,
    p_tipo_aplicacion: parsed.data.tipoAplicacion,
    p_modelo_drone: parsed.data.modeloDrone,
    p_dosis_por_hectarea: parsed.data.dosisPorHectarea,
    p_tipo_proyecto: parsed.data.tipoProyecto,
    p_proyecto_id: parsed.data.proyectoId,
    p_operador: parsed.data.operador,
    p_ayudantes: parsed.data.ayudantes,
    p_firma_agro_ruta: parsed.data.firmaAgroRuta,
    p_nombre_firma_agro: parsed.data.nombreFirmaAgro,
    p_firma_cliente_ruta: parsed.data.firmaClienteRuta,
    p_nombre_firma_cliente: parsed.data.nombreFirmaCliente,
    p_imagenes: parsed.data.imagenes,
    p_parcelas: parsed.data.parcelas,
    p_productos: parsed.data.productos,
    p_jornada: parsed.data.jornada,
  });

  if (error) {
    return { error: error.message || "No se pudo guardar el informe. Intenta de nuevo.", values: raw };
  }

  revalidatePath("/informes/campo");
  redirect(`/informes/campo/${informeId}`);
}

export async function editarInformeCampoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Campo puede crear pero NO editar (pedido explícito del usuario,
  // 2026-08-04) -- mismo patrón que la excepción de Compras/Planilla en
  // esSoporteOJefe(), pero puntual a esta acción.
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let ayudantes: unknown;
  let parcelas: unknown;
  let productos: unknown;
  let imagenes: unknown;
  try {
    ayudantes = JSON.parse(raw.ayudantes || "[]");
    parcelas = JSON.parse(raw.parcelas || "[]");
    productos = JSON.parse(raw.productos || "[]");
    imagenes = JSON.parse(raw.imagenes || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const supabase = await createClient();

  const proyecto = await resolverProyecto(supabase, raw.proyectoId);
  if (!proyecto) {
    return { error: "El proyecto seleccionado ya no existe.", values: raw };
  }

  const parsed = informeCampoEditSchema.safeParse({
    id: raw.id,
    cliente: proyecto.cliente,
    tipoProyecto: proyecto.tipoProyecto,
    proyectoId: raw.proyectoId,
    fecha: raw.fecha,
    finca: raw.finca,
    horaInicio: raw.horaInicio,
    horaFin: raw.horaFin,
    meteorologia: raw.meteorologia,
    tipoAplicacion: raw.tipoAplicacion,
    modeloDrone: raw.modeloDrone,
    dosisPorHectarea: raw.dosisPorHectarea,
    jornada: raw.jornada,
    operador: raw.operador,
    ayudantes,
    firmaAgroRuta: raw.firmaAgroRuta,
    nombreFirmaAgro: raw.nombreFirmaAgro,
    firmaClienteRuta: raw.firmaClienteRuta,
    nombreFirmaCliente: raw.nombreFirmaCliente,
    parcelas,
    productos,
    imagenes,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  // Rutas ya guardadas ANTES de editar -- se necesitan para saber cuáles
  // ya no están en la lista nueva y limpiarlas de Storage (el RPC borra
  // e inserta de nuevo las filas de informe_campo_imagenes, pero eso no
  // borra los archivos reales).
  const { data: imagenesAnteriores } = await supabase
    .from("informe_campo_imagenes")
    .select("ruta")
    .eq("informe_id", parsed.data.id);

  if (!esSoporteOJefe(perfil.rol)) {
    const { data: informeActual } = await supabase
      .from("informes_campo")
      .select("fecha")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (informeActual && !fechaPermitida(informeActual.fecha as string, perfil.rol)) {
      return { error: MENSAJE_REGISTRO_FECHA_VIEJA, values: raw };
    }
    if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
      return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
    }
  }

  const { error } = await supabase.rpc("editar_informe_campo", {
    p_informe_id: parsed.data.id,
    p_cliente: parsed.data.cliente,
    p_fecha: parsed.data.fecha,
    p_finca: parsed.data.finca,
    p_hora_inicio: parsed.data.horaInicio,
    p_hora_fin: parsed.data.horaFin,
    p_meteorologia: parsed.data.meteorologia,
    p_tipo_aplicacion: parsed.data.tipoAplicacion,
    p_modelo_drone: parsed.data.modeloDrone,
    p_dosis_por_hectarea: parsed.data.dosisPorHectarea,
    p_tipo_proyecto: parsed.data.tipoProyecto,
    p_proyecto_id: parsed.data.proyectoId,
    p_operador: parsed.data.operador,
    p_ayudantes: parsed.data.ayudantes,
    p_firma_agro_ruta: parsed.data.firmaAgroRuta,
    p_nombre_firma_agro: parsed.data.nombreFirmaAgro,
    p_firma_cliente_ruta: parsed.data.firmaClienteRuta,
    p_nombre_firma_cliente: parsed.data.nombreFirmaCliente,
    p_imagenes: parsed.data.imagenes,
    p_parcelas: parsed.data.parcelas,
    p_productos: parsed.data.productos,
    p_jornada: parsed.data.jornada,
  });

  if (error) {
    return { error: error.message || "No se pudo actualizar el informe. Intenta de nuevo.", values: raw };
  }

  // Cualquier imagen que ya no está en la lista nueva se limpia de
  // Storage (best-effort) para no ir dejando archivos huérfanos
  // acumulándose -- mismo criterio que editarInformeDiarioAction.
  const rutasQuitadas = (imagenesAnteriores ?? [])
    .map((r) => r.ruta as string)
    .filter((ruta) => !parsed.data.imagenes.includes(ruta));
  await Promise.all(rutasQuitadas.map((ruta) => eliminarImagenInformeCampoAction(ruta).catch(() => {})));

  revalidatePath("/informes/campo");
  revalidatePath(`/informes/campo/${parsed.data.id}`);
  redirect(`/informes/campo/${parsed.data.id}`);
}

export async function eliminarInformeCampoAction(id: string) {
  // Campo puede crear pero NO eliminar (pedido explícito del usuario,
  // 2026-08-04).
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");
  const supabase = await createClient();

  const [{ data: informe }, { data: imagenes }] = await Promise.all([
    supabase.from("informes_campo").select("firma_agro_ruta, firma_cliente_ruta").eq("id", id).maybeSingle(),
    supabase.from("informe_campo_imagenes").select("ruta").eq("informe_id", id),
  ]);

  const { error } = await supabase.rpc("eliminar_informe_campo", { p_informe_id: id });
  if (error) throw new Error(error.message || "No se pudo eliminar el informe.");

  if (informe?.firma_agro_ruta || informe?.firma_cliente_ruta) {
    const rutas = [informe.firma_agro_ruta, informe.firma_cliente_ruta].filter(
      (r): r is string => Boolean(r),
    );
    // Best-effort (igual que eliminarFotoColaboradorAction): si falla, queda
    // un archivo huérfano en Storage, pero no debe bloquear la eliminación.
    await supabase.storage.from("informes-campo-firmas").remove(rutas);
  }

  await Promise.all(
    (imagenes ?? []).map((img) => eliminarImagenInformeCampoAction(img.ruta as string).catch(() => {})),
  );

  revalidatePath("/informes/campo");
}
