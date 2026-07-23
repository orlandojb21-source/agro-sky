import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Colaboradores de planilla: pagados por dia trabajado, sin cuenta de
// acceso a la app -- son solo el nombre a quien se le paga. Lista fija por
// ahora (confirmado con el usuario); si el equipo cambia mas adelante se
// ajusta aqui y en la migracion 0016 (el check de la columna "colaborador").
export const COLABORADORES = [
  "Rafael Monterrey",
  "David Benavides",
  "Alberto Villalaz",
  "Julio Lobo",
] as const;

export type Colaborador = (typeof COLABORADORES)[number];

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
  porColaborador: Record<Colaborador, number>;
  total: number;
};

// Vista previa de lo pagado en el mes calendario actual (hora de Panama),
// por colaborador -- la suma quincenal/mensual completa para reportes
// queda para mas adelante, ya que los datos (fecha + monto por fila) ya
// quedan guardados para calcularla sin cambios al esquema.
export async function calcularTotalesMesActual(
  supabase: SupabaseServerClient,
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

  const porColaborador = Object.fromEntries(
    COLABORADORES.map((c) => [c, 0]),
  ) as Record<Colaborador, number>;

  let total = 0;
  for (const fila of data ?? []) {
    const nombre = fila.colaborador as Colaborador;
    const monto = Number(fila.monto);
    if (nombre in porColaborador) porColaborador[nombre] += monto;
    total += monto;
  }

  return { fechaDesde, fechaHasta, porColaborador, total };
}
