"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { informeCampoSchema } from "@/lib/validation/informesCampo";

const BUCKET_FIRMAS = "informes-campo-firmas";

// Versión de crearInformeCampoAction (lib/actions/informesCampo.ts) para
// cuando el informe se llenó sin señal: a diferencia de esa, aquí las
// firmas todavía NO están en Storage (llegan como los PNG crudos que se
// dibujaron sin conexión, ver offlineInformesCampo.ts) -- primero hay que
// subirlas, y como esto lo llama SincronizadorInformesCampo.tsx en segundo
// plano (no un <form>), nunca redirige: siempre devuelve un resultado para
// que el sincronizador decida qué hacer (reintentar, marcar error, etc.).
export async function sincronizarInformeCampoPendienteAction(
  formData: FormData,
): Promise<{ ok: true; informeId: string } | { ok: false; error: string }> {
  await requireWrite("informes");

  const raw = Object.fromEntries(formData) as Record<string, string>;
  const firmaAgro = formData.get("firmaAgro");
  const firmaCliente = formData.get("firmaCliente");
  if (!(firmaAgro instanceof Blob) || !(firmaCliente instanceof Blob)) {
    return { ok: false, error: "Faltan las firmas del informe." };
  }

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
    return { ok: false, error: "No se pudieron leer los datos del informe guardado." };
  }

  const supabase = await createClient();

  const rutaAgro = `${randomUUID()}.png`;
  const { error: errorSubidaAgro } = await supabase.storage
    .from(BUCKET_FIRMAS)
    .upload(rutaAgro, firmaAgro, { contentType: "image/png", upsert: false });
  if (errorSubidaAgro) {
    return { ok: false, error: "No se pudo subir la firma de Agro Sky. Se reintentará." };
  }

  const rutaCliente = `${randomUUID()}.png`;
  const { error: errorSubidaCliente } = await supabase.storage
    .from(BUCKET_FIRMAS)
    .upload(rutaCliente, firmaCliente, { contentType: "image/png", upsert: false });
  if (errorSubidaCliente) {
    await supabase.storage.from(BUCKET_FIRMAS).remove([rutaAgro]);
    return { ok: false, error: "No se pudo subir la firma del cliente. Se reintentará." };
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
    jornada: raw.jornada,
    operador: raw.operador,
    ayudantes,
    firmaAgroRuta: rutaAgro,
    nombreFirmaAgro: raw.nombreFirmaAgro,
    firmaClienteRuta: rutaCliente,
    nombreFirmaCliente: raw.nombreFirmaCliente,
    parcelas,
    productos,
    imagenes,
  });

  if (!parsed.success) {
    await supabase.storage.from(BUCKET_FIRMAS).remove([rutaAgro, rutaCliente]);
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
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
    await supabase.storage.from(BUCKET_FIRMAS).remove([rutaAgro, rutaCliente]);
    return { ok: false, error: error.message || "No se pudo guardar el informe. Se reintentará." };
  }

  revalidatePath("/informes/campo");
  return { ok: true, informeId: informeId as string };
}
