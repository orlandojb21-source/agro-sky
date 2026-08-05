"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { informeCampoSchema, informeCampoEditSchema } from "@/lib/validation/informesCampo";
import { eliminarImagenInformeCampoAction } from "./informeCampoImagen";
import type { ActionState } from "./types";

export async function crearInformeCampoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Campo SÍ puede crear un Informe de Campo (a diferencia de editar/
  // eliminar, ver más abajo) -- pedido explícito del usuario, 2026-08-04.
  await requireWrite("informes");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let ayudantes: unknown;
  let parcelas: unknown;
  let productos: unknown;
  try {
    ayudantes = JSON.parse(raw.ayudantes || "[]");
    parcelas = JSON.parse(raw.parcelas || "[]");
    productos = JSON.parse(raw.productos || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const parsed = informeCampoSchema.safeParse({
    cliente: raw.cliente,
    fecha: raw.fecha,
    finca: raw.finca,
    horaInicio: raw.horaInicio,
    horaFin: raw.horaFin,
    meteorologia: raw.meteorologia,
    tipoAplicacion: raw.tipoAplicacion,
    modeloDrone: raw.modeloDrone,
    dosisPorHectarea: raw.dosisPorHectarea,
    tipoProyecto: raw.tipoProyecto,
    operador: raw.operador,
    ayudantes,
    firmaAgroRuta: raw.firmaAgroRuta,
    nombreFirmaAgro: raw.nombreFirmaAgro,
    firmaClienteRuta: raw.firmaClienteRuta,
    nombreFirmaCliente: raw.nombreFirmaCliente,
    parcelas,
    productos,
    imagenRuta: raw.imagenRuta,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
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
    p_operador: parsed.data.operador,
    p_ayudantes: parsed.data.ayudantes,
    p_firma_agro_ruta: parsed.data.firmaAgroRuta,
    p_nombre_firma_agro: parsed.data.nombreFirmaAgro,
    p_firma_cliente_ruta: parsed.data.firmaClienteRuta,
    p_nombre_firma_cliente: parsed.data.nombreFirmaCliente,
    p_imagen_ruta: parsed.data.imagenRuta,
    p_parcelas: parsed.data.parcelas,
    p_productos: parsed.data.productos,
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
  try {
    ayudantes = JSON.parse(raw.ayudantes || "[]");
    parcelas = JSON.parse(raw.parcelas || "[]");
    productos = JSON.parse(raw.productos || "[]");
  } catch {
    return { error: "No se pudieron leer los datos del informe. Intenta de nuevo.", values: raw };
  }

  const parsed = informeCampoEditSchema.safeParse({
    id: raw.id,
    cliente: raw.cliente,
    fecha: raw.fecha,
    finca: raw.finca,
    horaInicio: raw.horaInicio,
    horaFin: raw.horaFin,
    meteorologia: raw.meteorologia,
    tipoAplicacion: raw.tipoAplicacion,
    modeloDrone: raw.modeloDrone,
    dosisPorHectarea: raw.dosisPorHectarea,
    tipoProyecto: raw.tipoProyecto,
    operador: raw.operador,
    ayudantes,
    firmaAgroRuta: raw.firmaAgroRuta,
    nombreFirmaAgro: raw.nombreFirmaAgro,
    firmaClienteRuta: raw.firmaClienteRuta,
    nombreFirmaCliente: raw.nombreFirmaCliente,
    parcelas,
    productos,
    imagenRuta: raw.imagenRuta,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
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
    p_operador: parsed.data.operador,
    p_ayudantes: parsed.data.ayudantes,
    p_firma_agro_ruta: parsed.data.firmaAgroRuta,
    p_nombre_firma_agro: parsed.data.nombreFirmaAgro,
    p_firma_cliente_ruta: parsed.data.firmaClienteRuta,
    p_nombre_firma_cliente: parsed.data.nombreFirmaCliente,
    p_imagen_ruta: parsed.data.imagenRuta,
    p_parcelas: parsed.data.parcelas,
    p_productos: parsed.data.productos,
  });

  if (error) {
    return { error: error.message || "No se pudo actualizar el informe. Intenta de nuevo.", values: raw };
  }

  // Si se reemplazó o se quitó la imagen, se limpia la anterior en Storage
  // (best-effort) para no ir dejando archivos huérfanos acumulándose --
  // mismo patrón que editarInformeDiarioAction.
  const imagenRutaAnterior = raw.imagenRutaAnterior;
  if (imagenRutaAnterior && imagenRutaAnterior !== parsed.data.imagenRuta) {
    await eliminarImagenInformeCampoAction(imagenRutaAnterior).catch(() => {});
  }

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

  const { data: informe } = await supabase
    .from("informes_campo")
    .select("firma_agro_ruta, firma_cliente_ruta, imagen_ruta")
    .eq("id", id)
    .maybeSingle();

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

  if (informe?.imagen_ruta) {
    await eliminarImagenInformeCampoAction(informe.imagen_ruta).catch(() => {});
  }

  revalidatePath("/informes/campo");
}
