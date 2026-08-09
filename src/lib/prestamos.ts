import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type Prestamo = {
  id: string;
  colaborador: string;
  fecha: string;
  monto: number;
  cuotaQuincenal: number;
  nota: string | null;
};

// El saldo pendiente de un préstamo no se guarda como columna -- se
// calcula al vuelo sumando lo que ya se ha descontado en pagos de
// planilla que referencian ese préstamo (mismo principio que
// calcularTotalesMesActual: sumar sobre planilla_pagos en vez de
// mantener un total guardado que se desincronizaría al editar/borrar un
// pago con descuento de préstamo).
export async function calcularSaldoPrestamo(
  supabase: SupabaseServerClient,
  prestamoId: string,
  montoOriginal: number,
): Promise<number> {
  const { data } = await supabase
    .from("planilla_pagos")
    .select("monto_prestamo")
    .eq("prestamo_id", prestamoId);

  const totalAbonado = (data ?? []).reduce((suma, p) => suma + Number(p.monto_prestamo ?? 0), 0);
  return Math.max(0, Math.round((montoOriginal - totalAbonado) * 100) / 100);
}

// Misma idea que calcularSaldoPrestamo pero para varios préstamos a la
// vez (usado en el listado de Préstamos) -- 1 sola consulta a
// planilla_pagos en vez de una por préstamo.
export async function calcularSaldosPrestamos(
  supabase: SupabaseServerClient,
  prestamos: { id: string; monto: number }[],
): Promise<Map<string, number>> {
  const saldos = new Map<string, number>();
  if (prestamos.length === 0) return saldos;

  const { data } = await supabase
    .from("planilla_pagos")
    .select("prestamo_id, monto_prestamo")
    .in(
      "prestamo_id",
      prestamos.map((p) => p.id),
    );

  const abonadoPorPrestamo = new Map<string, number>();
  for (const fila of data ?? []) {
    const id = fila.prestamo_id as string;
    abonadoPorPrestamo.set(id, (abonadoPorPrestamo.get(id) ?? 0) + Number(fila.monto_prestamo ?? 0));
  }

  for (const p of prestamos) {
    const abonado = abonadoPorPrestamo.get(p.id) ?? 0;
    saldos.set(p.id, Math.max(0, Math.round((p.monto - abonado) * 100) / 100));
  }
  return saldos;
}

// Un colaborador solo puede tener un préstamo activo a la vez (pedido
// explícito del usuario, 2026-08-07) -- se recorren sus préstamos del más
// reciente al más viejo y se devuelve el primero con saldo pendiente > 0.
// Se usa tanto para bloquear un 2º préstamo activo (crearPrestamoAction)
// como para sugerir el descuento en el formulario de Pago.
export async function obtenerPrestamoActivo(
  supabase: SupabaseServerClient,
  colaborador: string,
): Promise<(Prestamo & { saldoPendiente: number }) | null> {
  const { data } = await supabase
    .from("prestamos")
    .select("id, colaborador, fecha, monto, cuota_quincenal, nota")
    .eq("colaborador", colaborador)
    .order("fecha", { ascending: false });

  for (const p of data ?? []) {
    const monto = Number(p.monto);
    const saldoPendiente = await calcularSaldoPrestamo(supabase, p.id as string, monto);
    if (saldoPendiente > 0) {
      return {
        id: p.id as string,
        colaborador: p.colaborador as string,
        fecha: p.fecha as string,
        monto,
        cuotaQuincenal: Number(p.cuota_quincenal),
        nota: p.nota as string | null,
        saldoPendiente,
      };
    }
  }
  return null;
}
