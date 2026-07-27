import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Panama esta siempre en UTC-5 (no tiene horario de verano). El servidor
// puede correr en cualquier zona horaria (ej. UTC en Vercel), asi que en
// vez de usar los getters locales de Date (que dependerian de esa zona),
// se resta el offset a mano y se leen los getters UTC -- mismo principio
// que formatDateOnly() en lib/format.ts.
const OFFSET_PANAMA_MS = 5 * 60 * 60 * 1000;

function hoyEnPanama(): { anio: number; mes: number } {
  const ahora = new Date(Date.now() - OFFSET_PANAMA_MS);
  return { anio: ahora.getUTCFullYear(), mes: ahora.getUTCMonth() };
}

function aISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export type TotalesMes = {
  fechaDesde: string;
  fechaHasta: string;
  porColaborador: Record<string, number>;
  total: number;
};

// Vista previa de lo pagado en el mes calendario actual (hora de Panama),
// por colaborador -- la suma quincenal/mensual completa para reportes
// queda para mas adelante, ya que los datos (fecha + monto por fila) ya
// quedan guardados para calcularla sin cambios al esquema.
//
// "nombresColaboradores" viene de la tabla colaboradores (administrable
// desde /planilla/colaboradores) en vez de una lista fija en el codigo.
export async function calcularTotalesMesActual(
  supabase: SupabaseServerClient,
  nombresColaboradores: string[],
): Promise<TotalesMes> {
  const { anio, mes } = hoyEnPanama();
  const fechaDesde = aISO(anio, mes, 1);
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const fechaHasta = aISO(anio, mes, ultimoDia);

  const { data } = await supabase
    .from("planilla_pagos")
    .select("colaborador, monto")
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);

  const porColaborador: Record<string, number> = Object.fromEntries(
    nombresColaboradores.map((c) => [c, 0]),
  );

  let total = 0;
  for (const fila of data ?? []) {
    const nombre = fila.colaborador as string;
    const monto = Number(fila.monto);
    if (nombre in porColaborador) porColaborador[nombre] += monto;
    total += monto;
  }

  return { fechaDesde, fechaHasta, porColaborador, total };
}
