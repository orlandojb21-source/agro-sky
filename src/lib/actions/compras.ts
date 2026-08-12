"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { aprobarSchema, rechazarSchema, solicitudSchema } from "@/lib/validation/compras";
import { fechaPermitida, MENSAJE_FECHA_NO_PERMITIDA } from "@/lib/fechaRestriccion";
import type { ActionState } from "./types";

export async function crearSolicitudAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("compras");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let items: unknown;
  try {
    items = JSON.parse(raw.items || "[]");
  } catch {
    return { error: "No se pudieron leer los productos de la solicitud. Intenta de nuevo.", values: raw };
  }

  const parsed = solicitudSchema.safeParse({
    fecha: raw.fecha,
    nota: raw.nota,
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
    return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
  }

  const supabase = await createClient();
  const { data: solicitudId, error } = await supabase.rpc("crear_solicitud_compra", {
    p_fecha: parsed.data.fecha,
    p_nota: parsed.data.nota || null,
    p_items: parsed.data.items.map((item) => ({
      producto_id: item.productoId,
      cantidad_solicitada: item.cantidadSolicitada,
    })),
  });

  if (error) {
    return {
      error: error.message || "No se pudo guardar la solicitud. Intenta de nuevo.",
      values: raw,
    };
  }

  revalidatePath("/compras");
  redirect(`/compras/${solicitudId}`);
}

// Aprueba una solicitud pendiente y la convierte en orden de compra. El RPC
// valida que quien llama sea jefe/soporte (auth_gestiona_usuarios) -- aca
// solo se maneja el error para mostrarlo en la misma pantalla. Se invoca
// desde un <form action={aprobarSolicitudAction.bind(null, id)}> simple,
// no desde useActionState, por eso el patron de error es redirect con el
// mensaje en la query string (igual que confirmarCotizacionAction).
export async function aprobarSolicitudAction(id: string, formData: FormData) {
  await requireWrite("compras");
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = aprobarSchema.safeParse(raw);

  if (!parsed.success) {
    const mensaje = parsed.error.issues[0]?.message ?? "Datos inválidos";
    redirect(`/compras/${id}?error=${encodeURIComponent(mensaje)}`);
  }

  const supabase = await createClient();
  const { data: ordenId, error } = await supabase.rpc("aprobar_solicitud_compra", {
    p_solicitud_id: id,
    p_proveedor_nombre: parsed.data.proveedorNombre,
    p_proveedor_contacto: parsed.data.proveedorContacto || null,
  });

  if (error) {
    const mensaje = error.message || "No se pudo aprobar la solicitud.";
    redirect(`/compras/${id}?error=${encodeURIComponent(mensaje)}`);
  }

  revalidatePath("/compras");
  revalidatePath("/compras/ordenes");
  redirect(`/compras/ordenes/${ordenId}`);
}

export async function rechazarSolicitudAction(id: string, formData: FormData) {
  await requireWrite("compras");
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = rechazarSchema.safeParse(raw);

  const supabase = await createClient();
  const { error } = await supabase.rpc("rechazar_solicitud_compra", {
    p_solicitud_id: id,
    p_motivo: parsed.success ? parsed.data.motivo || null : null,
  });

  if (error) {
    const mensaje = error.message || "No se pudo rechazar la solicitud.";
    redirect(`/compras/${id}?error=${encodeURIComponent(mensaje)}`);
  }

  revalidatePath("/compras");
  redirect(`/compras/${id}`);
}

export async function eliminarSolicitudAction(id: string) {
  await requireWrite("compras");
  const supabase = await createClient();
  const { error } = await supabase.from("solicitudes_compra").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la solicitud.");
  revalidatePath("/compras");
}

// Confirma la recepcion de una orden (todo o nada): el RPC suma cada
// renglon al inventario automaticamente. Abierto a los 3 roles.
export async function confirmarRecepcionAction(id: string) {
  await requireWrite("compras");
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirmar_recepcion_orden", { p_orden_id: id });

  if (error) {
    const mensaje = error.message || "No se pudo confirmar la recepción.";
    redirect(`/compras/ordenes/${id}?error=${encodeURIComponent(mensaje)}`);
  }

  revalidatePath("/compras/ordenes");
  revalidatePath("/inventario/nuevos");
  revalidatePath("/inventario/usados");
  redirect(`/compras/ordenes/${id}`);
}

export async function eliminarOrdenAction(id: string) {
  await requireWrite("compras");
  const supabase = await createClient();
  const { error } = await supabase.from("ordenes_compra").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la orden.");
  revalidatePath("/compras/ordenes");
}
