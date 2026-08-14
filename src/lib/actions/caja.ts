"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  gastoSchema,
  gastoEditSchema,
  reposicionSchema,
  reposicionEditSchema,
  vueltoSchema,
  arqueoSchema,
} from "@/lib/validation/caja";
import { DENOMINACIONES, calcularSaldoActual, detalleDesdeFormData } from "@/lib/caja";
import { categoriaGastoValida } from "@/lib/categorias";
import { fechaPermitida, MENSAJE_FECHA_NO_PERMITIDA, MENSAJE_REGISTRO_FECHA_VIEJA } from "@/lib/fechaRestriccion";
import { esSoporteOJefe } from "@/lib/roles";
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

  if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
    return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
  }

  const monto = detalleDesdeFormData(raw, "monto");
  const entregado = detalleDesdeFormData(raw, "entregado");
  const vuelto = detalleDesdeFormData(raw, "vuelto");

  const supabase = await createClient();

  if (!(await categoriaGastoValida(supabase, "caja_menuda", parsed.data.categoria))) {
    return { error: "Categoría no válida.", values: raw };
  }

  const { error } = await supabase.from("caja_gastos").insert({
    fecha: parsed.data.fecha,
    categoria: parsed.data.categoria,
    nombre: parsed.data.nombre || null,
    proveedor_id: parsed.data.proveedorId || null,
    proyecto_id: parsed.data.proyectoId || null,
    numero_recibo: parsed.data.numeroRecibo || null,
    concepto: parsed.data.concepto || null,
    monto: monto?.total ?? null,
    monto_detalle: monto?.detalle ?? null,
    colaborador: parsed.data.colaborador || null,
    previsto: parsed.data.previsto,
    entregado: entregado?.total ?? null,
    entregado_detalle: entregado?.detalle ?? null,
    vuelto: vuelto?.total ?? null,
    vuelto_detalle: vuelto?.detalle ?? null,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el movimiento. Intenta de nuevo.", values: raw };

  revalidatePath("/gastos-operativos");
  redirect("/gastos-operativos");
}

export async function editarGastoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("gastos-operativos");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = gastoEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const monto = detalleDesdeFormData(raw, "monto");
  const entregado = detalleDesdeFormData(raw, "entregado");
  const vuelto = detalleDesdeFormData(raw, "vuelto");

  const supabase = await createClient();

  if (!(await categoriaGastoValida(supabase, "caja_menuda", parsed.data.categoria))) {
    return { error: "Categoría no válida.", values: raw };
  }

  if (!esSoporteOJefe(perfil.rol)) {
    const { data: gastoActual } = await supabase
      .from("caja_gastos")
      .select("fecha")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (gastoActual && !fechaPermitida(gastoActual.fecha as string, perfil.rol)) {
      return { error: MENSAJE_REGISTRO_FECHA_VIEJA, values: raw };
    }
    if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
      return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
    }
  }

  const { error } = await supabase
    .from("caja_gastos")
    .update({
      fecha: parsed.data.fecha,
      categoria: parsed.data.categoria,
      nombre: parsed.data.nombre || null,
      proveedor_id: parsed.data.proveedorId || null,
      proyecto_id: parsed.data.proyectoId || null,
      numero_recibo: parsed.data.numeroRecibo || null,
      concepto: parsed.data.concepto || null,
      monto: monto?.total ?? null,
      monto_detalle: monto?.detalle ?? null,
      colaborador: parsed.data.colaborador || null,
      previsto: parsed.data.previsto,
      entregado: entregado?.total ?? null,
      entregado_detalle: entregado?.detalle ?? null,
      vuelto: vuelto?.total ?? null,
      vuelto_detalle: vuelto?.detalle ?? null,
      nota: parsed.data.nota || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo actualizar el movimiento. Intenta de nuevo.", values: raw };

  revalidatePath("/gastos-operativos");
  redirect("/gastos-operativos");
}

export async function eliminarGastoAction(id: string) {
  await requireWrite("gastos-operativos");
  const supabase = await createClient();
  const { error } = await supabase.from("caja_gastos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el movimiento.");
  revalidatePath("/gastos-operativos");
}

// Registrar el vuelto directo desde la tabla de Movimientos (sin pasar por
// la pantalla de editar completa) -- se usa en la mini-forma inline de
// MovimientosTabla para los movimientos que tienen "entregado" pero aun no
// tienen "vuelto".
export async function registrarVueltoAction(id: string, formData: FormData) {
  await requireWrite("gastos-operativos");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = vueltoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Vuelto inválido");
  }

  const vuelto = detalleDesdeFormData(raw, "vuelto");

  const supabase = await createClient();
  const { error } = await supabase
    .from("caja_gastos")
    .update({ vuelto: vuelto?.total ?? null, vuelto_detalle: vuelto?.detalle ?? null })
    .eq("id", id);

  if (error) throw new Error("No se pudo registrar el vuelto.");

  revalidatePath("/gastos-operativos");
}

export async function crearReposicionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("gastos-operativos");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = reposicionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
    return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("caja_reposiciones").insert({
    fecha: parsed.data.fecha,
    monto: parsed.data.monto,
    monto_detalle: null,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar la reposición. Intenta de nuevo.", values: raw };

  revalidatePath("/gastos-operativos");
  redirect("/gastos-operativos");
}

export async function editarReposicionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("gastos-operativos");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = reposicionEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();

  if (!esSoporteOJefe(perfil.rol)) {
    const { data: reposicionActual } = await supabase
      .from("caja_reposiciones")
      .select("fecha")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (reposicionActual && !fechaPermitida(reposicionActual.fecha as string, perfil.rol)) {
      return { error: MENSAJE_REGISTRO_FECHA_VIEJA, values: raw };
    }
    if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
      return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
    }
  }

  const { error } = await supabase
    .from("caja_reposiciones")
    .update({
      fecha: parsed.data.fecha,
      monto: parsed.data.monto,
      monto_detalle: null,
      nota: parsed.data.nota || null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "No se pudo actualizar la reposición. Intenta de nuevo.", values: raw };
  }

  revalidatePath("/gastos-operativos");
  redirect("/gastos-operativos");
}

export async function eliminarReposicionAction(id: string) {
  await requireWrite("gastos-operativos");
  const supabase = await createClient();
  const { error } = await supabase.from("caja_reposiciones").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la reposición.");
  revalidatePath("/gastos-operativos");
}

export async function crearArqueoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("gastos-operativos");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = arqueoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  if (!fechaPermitida(parsed.data.fecha, perfil.rol)) {
    return { error: MENSAJE_FECHA_NO_PERMITIDA, values: raw };
  }

  const detalle: Record<string, number> = {};
  let totalContado = 0;
  for (const d of DENOMINACIONES) {
    const cantidad = Math.trunc(Number(raw[`cantidad_${d.id}`] || 0));
    detalle[d.id] = cantidad;
    totalContado += cantidad * d.valor;
  }
  totalContado = Math.round(totalContado * 100) / 100;

  const supabase = await createClient();
  const saldoEsperado = await calcularSaldoActual(supabase);
  const diferencia = Math.round((totalContado - saldoEsperado) * 100) / 100;

  const { error } = await supabase.from("caja_arqueos").insert({
    fecha: parsed.data.fecha,
    detalle,
    total_contado: totalContado,
    saldo_esperado: saldoEsperado,
    diferencia,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el arqueo. Intenta de nuevo.", values: raw };

  revalidatePath("/gastos-operativos/arqueos");
  redirect("/gastos-operativos/arqueos");
}

export async function eliminarArqueoAction(id: string) {
  await requireWrite("gastos-operativos");
  const supabase = await createClient();
  const { error } = await supabase.from("caja_arqueos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el arqueo.");
  revalidatePath("/gastos-operativos/arqueos");
}
