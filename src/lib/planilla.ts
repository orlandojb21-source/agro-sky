import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Panama esta siempre en UTC-5 (no tiene horario de verano). El servidor
// puede correr en cualquier zona horaria (ej. UTC en Vercel), asi que en
// vez de usar los getters locales de Date (que dependerian de esa zona),
// se resta el offset a mano y se leen los getters UTC -- mismo principio
// que formatDateOnly() en lib/format.ts.
const OFFSET_PANAMA_MS = 5 * 60 * 60 * 1000;

function hoyEnPanama(): { anio: number; mes: number; dia: number } {
  const ahora = new Date(Date.now() - OFFSET_PANAMA_MS);
  return { anio: ahora.getUTCFullYear(), mes: ahora.getUTCMonth(), dia: ahora.getUTCDate() };
}

function aISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export type QuincenaActual = {
  fechaDesde: string;
  fechaHasta: string;
  etiqueta: string;
};

// Las quincenas son siempre 1-15 y 16-fin de mes (calendario de pago real
// de la empresa, confirmado por el usuario 2026-08-04) -- calculado con
// la misma hora de Panama que calcularTotalesMesActual, por la misma
// razon (el servidor puede correr en otra zona horaria).
function quincenaDesdePartes(anio: number, mes: number, dia: number): QuincenaActual {
  const esPrimeraQuincena = dia <= 15;
  const ultimoDiaMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const diaHasta = esPrimeraQuincena ? 15 : ultimoDiaMes;

  return {
    fechaDesde: aISO(anio, mes, esPrimeraQuincena ? 1 : 16),
    fechaHasta: aISO(anio, mes, diaHasta),
    etiqueta: `${esPrimeraQuincena ? 1 : 16} al ${diaHasta} de ${MESES[mes]}`,
  };
}

export function obtenerQuincenaActual(): QuincenaActual {
  const { anio, mes, dia } = hoyEnPanama();
  return quincenaDesdePartes(anio, mes, dia);
}

// Igual que obtenerQuincenaActual(), pero para una fecha cualquiera (no
// necesariamente hoy) -- usado para calcular a qué quincena pertenece la
// fecha elegida en un formulario (ej. "Calcular pago sugerido" de un
// colaborador Fijo en Pagos), en vez de asumir que siempre es la quincena
// en curso. No depende de la hora del servidor porque la fecha ya viene
// como texto "YYYY-MM-DD" desde el formulario.
export function obtenerQuincenaDeFecha(fechaISO: string): QuincenaActual {
  const [anio, mesUno, dia] = fechaISO.split("-").map(Number);
  return quincenaDesdePartes(anio, mesUno - 1, dia);
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
    .select("colaborador, monto, bonificacion, decimo_tercer_mes, css, seguro_educativo, monto_prestamo")
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta);

  const porColaborador: Record<string, number> = Object.fromEntries(
    nombresColaboradores.map((c) => [c, 0]),
  );

  let total = 0;
  for (const fila of data ?? []) {
    const nombre = fila.colaborador as string;
    // Neto -- lo que cada colaborador recibió de verdad esa vez (pedido
    // explícito del usuario, 2026-08-15: esta cifra tiene que coincidir
    // con el Talonario de cada quien, no con un "gasto bruto" aparte que
    // nadie reconoce). Mismo criterio que obtenerReportePlanillaAction.
    const monto =
      Number(fila.monto) +
      Number(fila.bonificacion ?? 0) +
      Number(fila.decimo_tercer_mes ?? 0) -
      Number(fila.css ?? 0) -
      Number(fila.seguro_educativo ?? 0) -
      Number(fila.monto_prestamo ?? 0);
    if (nombre in porColaborador) porColaborador[nombre] += monto;
    total += monto;
  }

  return { fechaDesde, fechaHasta, porColaborador, total };
}
