"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ventaSchema } from "@/lib/validation/ventas";
import type { ActionState } from "./types";

export async function crearVentaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  let items: unknown;
  try {
    items = JSON.parse(raw.items || "[]");
  } catch {
    return { error: "No se pudieron leer los productos de la venta. Intenta de nuevo.", values: raw };
  }

  const parsed = ventaSchema.safeParse({
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
  const { data: ventaId, error } = await supabase.rpc("crear_venta", {
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
      error: error.message || "No se pudo guardar la venta. Intenta de nuevo.",
      values: raw,
    };
  }

  revalidatePath("/ventas");
  revalidatePath("/inventario/nuevos");
  revalidatePath("/inventario/usados");
  redirect(`/ventas/${ventaId}`);
}

export async function eliminarVentaAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_venta", { p_venta_id: id });
  if (error) throw new Error(error.message || "No se pudo eliminar la venta.");
  revalidatePath("/ventas");
  revalidatePath("/inventario/nuevos");
  revalidatePath("/inventario/usados");
}
