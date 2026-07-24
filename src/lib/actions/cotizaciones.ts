"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { cotizacionSchema } from "@/lib/validation/cotizaciones";
import type { ActionState } from "./types";

export async function crearCotizacionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let items: unknown;
  try {
    items = JSON.parse(raw.items || "[]");
  } catch {
    return { error: "No se pudieron leer los productos de la cotización. Intenta de nuevo.", values: raw };
  }

  const parsed = cotizacionSchema.safeParse({
    fecha: raw.fecha,
    clienteNombre: raw.clienteNombre,
    clienteDocumento: raw.clienteDocumento,
    nota: raw.nota,
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { data: cotizacionId, error } = await supabase.rpc("crear_cotizacion", {
    p_fecha: parsed.data.fecha,
    p_cliente_nombre: parsed.data.clienteNombre,
    p_cliente_documento: parsed.data.clienteDocumento || null,
    p_nota: parsed.data.nota || null,
    p_items: parsed.data.items.map((item) => ({
      tipo: item.tipo,
      producto_id: item.productoId,
      servicio_id: item.servicioId,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
    })),
  });

  if (error) {
    return {
      error: error.message || "No se pudo guardar la cotización. Intenta de nuevo.",
      values: raw,
    };
  }

  revalidatePath("/ventas/cotizaciones");
  redirect(`/ventas/cotizaciones/${cotizacionId}`);
}

// Convierte una cotización pendiente en una venta real (factura): crea la
// venta con el mismo guard de stock atómico que crearVentaAction, y deja
// la cotización marcada "confirmada" con un link a esa venta. Si falla
// (ej. no hay stock suficiente), vuelve al detalle de la cotización con
// un mensaje de error en vez de lanzar una excepción sin manejar -- este
// action se invoca desde un <form> simple, no desde useActionState, así
// que no hay un ActionState al que devolver el error directamente.
export async function confirmarCotizacionAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { data: ventaId, error } = await supabase.rpc("confirmar_cotizacion", {
    p_cotizacion_id: id,
  });

  if (error) {
    const mensaje = error.message || "No se pudo confirmar la cotización.";
    redirect(`/ventas/cotizaciones/${id}?error=${encodeURIComponent(mensaje)}`);
  }

  revalidatePath("/ventas/cotizaciones");
  revalidatePath("/ventas");
  revalidatePath("/inventario/nuevos");
  revalidatePath("/inventario/usados");
  redirect(`/ventas/${ventaId}`);
}

export async function eliminarCotizacionAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("cotizaciones").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la cotización.");
  revalidatePath("/ventas/cotizaciones");
}
