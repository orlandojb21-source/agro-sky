"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { gastoSchema, gastoEditSchema } from "@/lib/validation/gastos";
import { eliminarComprobanteGastoAction } from "@/lib/actions/gastoComprobante";
import { categoriaGastoValida } from "@/lib/categorias";
import type { ActionState } from "./types";

export async function crearGastoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("gastos-operativos");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = gastoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  if (!(await categoriaGastoValida(supabase, "compras", parsed.data.categoria))) {
    return { error: "Categoría no válida.", values: raw };
  }

  const { error } = await supabase.from("gastos").insert({
    fecha: parsed.data.fecha,
    proveedor_id: parsed.data.proveedorId || null,
    categoria: parsed.data.categoria,
    categoria_otro: parsed.data.categoria === "otro" ? parsed.data.categoriaOtro : null,
    numero_factura: parsed.data.numeroFactura || null,
    monto: parsed.data.monto,
    descripcion: parsed.data.descripcion || null,
    comprobante_ruta: parsed.data.comprobanteRuta || null,
    estado_pago: parsed.data.estadoPago,
    fecha_tope_pago: parsed.data.estadoPago === "por_pagar" ? parsed.data.fechaTopePago : null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el gasto. Intenta de nuevo.", values: raw };

  revalidatePath("/gastos-operativos/gastos");
  redirect("/gastos-operativos/gastos");
}

export async function editarGastoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("gastos-operativos");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = gastoEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  if (!(await categoriaGastoValida(supabase, "compras", parsed.data.categoria))) {
    return { error: "Categoría no válida.", values: raw };
  }

  const { error } = await supabase
    .from("gastos")
    .update({
      fecha: parsed.data.fecha,
      proveedor_id: parsed.data.proveedorId || null,
      categoria: parsed.data.categoria,
      categoria_otro: parsed.data.categoria === "otro" ? parsed.data.categoriaOtro : null,
      numero_factura: parsed.data.numeroFactura || null,
      monto: parsed.data.monto,
      descripcion: parsed.data.descripcion || null,
      comprobante_ruta: parsed.data.comprobanteRuta || null,
      estado_pago: parsed.data.estadoPago,
      fecha_tope_pago: parsed.data.estadoPago === "por_pagar" ? parsed.data.fechaTopePago : null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo guardar el gasto. Intenta de nuevo.", values: raw };

  // Si se reemplazó o se quitó el comprobante, se limpia el anterior en
  // Storage (best-effort, ver eliminarComprobanteGastoAction) para no ir
  // dejando archivos huérfanos acumulándose.
  const comprobanteRutaAnterior = raw.comprobanteRutaAnterior;
  if (comprobanteRutaAnterior && comprobanteRutaAnterior !== parsed.data.comprobanteRuta) {
    await eliminarComprobanteGastoAction(comprobanteRutaAnterior).catch(() => {});
  }

  revalidatePath("/gastos-operativos/gastos");
  redirect("/gastos-operativos/gastos");
}

export async function eliminarGastoAction(id: string) {
  await requireWrite("gastos-operativos");
  const supabase = await createClient();

  const { data: gasto } = await supabase
    .from("gastos")
    .select("comprobante_ruta")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el gasto.");

  if (gasto?.comprobante_ruta) {
    await eliminarComprobanteGastoAction(gasto.comprobante_ruta).catch(() => {});
  }

  revalidatePath("/gastos-operativos/gastos");
}
