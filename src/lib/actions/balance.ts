"use server";

import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIA_GASTO_LABEL } from "@/lib/validation/gastos";
import {
  acumuladoVacio,
  sumarAcumulado,
  aFila,
  redondear,
  type AcumuladoPersona,
  type FilaReportePlanilla,
} from "@/lib/planilla";

export type FilaMontoGenerica = { fecha: string; descripcion: string; monto: number };
export type SeccionMontos = { filas: FilaMontoGenerica[]; total: number };
export type FilaCategoria = { categoria: string; monto: number };

export type ReporteBalanceCompleto = {
  etiquetaPeriodo: string;
  ventas: SeccionMontos;
  cajaMenudaReposiciones: SeccionMontos;
  cajaMenudaGastos: SeccionMontos;
  cajaMenudaPorCategoria: FilaCategoria[];
  comprasGastos: SeccionMontos;
  comprasPorCategoria: FilaCategoria[];
  planilla: { filas: FilaReportePlanilla[]; total: number };
  prestamos: SeccionMontos;
  resumen: { ingresos: number; egresos: number; neto: number };
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function aSeccion(filas: FilaMontoGenerica[]): SeccionMontos {
  return { filas, total: redondear(filas.reduce((s, f) => s + f.monto, 0)) };
}

function porCategoria(filas: { categoria: string; monto: number }[]): FilaCategoria[] {
  const mapa = new Map<string, number>();
  for (const f of filas) {
    mapa.set(f.categoria, (mapa.get(f.categoria) ?? 0) + f.monto);
  }
  return Array.from(mapa.entries())
    .map(([categoria, monto]) => ({ categoria, monto: redondear(monto) }))
    .sort((a, b) => b.monto - a.monto);
}

// Reporte de TODO lo que se ve en Balance (Ventas, Caja Menuda, Compras,
// Planilla, Préstamos) para un período elegido -- mensual (mes 1-12) o
// anual (mes null, todo el año). Cada sección trae su detalle línea por
// línea más su total, para poder leerlo y verificarlo sin tener que
// entrar a cada módulo por separado. Préstamos otorgados se muestra
// aparte del Resumen (no es Ingreso ni Egreso -- mismo criterio que ya
// usa la tarjeta de Préstamos en Balance).
export async function obtenerReporteBalanceCompletoAction(
  anio: number,
  mes: number | null,
): Promise<ReporteBalanceCompleto> {
  await requireSection("balance");
  const supabase = await createClient();

  const fechaDesde = mes === null ? `${anio}-01-01` : `${anio}-${String(mes).padStart(2, "0")}-01`;
  const fechaHasta =
    mes === null
      ? `${anio}-12-31`
      : `${anio}-${String(mes).padStart(2, "0")}-${String(
          new Date(Date.UTC(anio, mes, 0)).getUTCDate(),
        ).padStart(2, "0")}`;
  const etiquetaPeriodo = mes === null ? `Año ${anio}` : `${MESES[mes - 1]} ${anio}`;

  const [
    { data: ventasData },
    { data: reposicionesData },
    { data: cajaGastosData },
    { data: comprasGastosData },
    { data: pagosData },
    { data: prestamosData },
  ] = await Promise.all([
    supabase
      .from("ventas")
      .select("fecha, numero_factura, cliente_nombre, total")
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .order("fecha"),
    supabase
      .from("caja_reposiciones")
      .select("fecha, monto, nota")
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .order("fecha"),
    supabase
      .from("caja_gastos")
      .select("fecha, categoria, concepto, nombre, monto, entregado, vuelto")
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .order("fecha"),
    supabase
      .from("gastos")
      .select("fecha, categoria, categoria_otro, monto, proveedores ( nombre )")
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .order("fecha"),
    supabase
      .from("planilla_pagos")
      .select("colaborador, fecha, monto, bonificacion, decimo_tercer_mes, css, seguro_educativo, monto_prestamo")
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .order("fecha"),
    supabase
      .from("prestamos")
      .select("fecha, colaborador, monto")
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .order("fecha"),
  ]);

  const ventas = aSeccion(
    (ventasData ?? []).map((v) => ({
      fecha: v.fecha as string,
      descripcion: `Factura #${v.numero_factura} — ${v.cliente_nombre}`,
      monto: Number(v.total),
    })),
  );

  const cajaMenudaReposiciones = aSeccion(
    (reposicionesData ?? []).map((r) => ({
      fecha: r.fecha as string,
      descripcion: (r.nota as string | null) || "Reposición",
      monto: Number(r.monto),
    })),
  );

  // El gasto real es lo entregado menos el vuelto (mismo criterio que
  // balance/page.tsx para el resto del dashboard).
  const cajaGastosFilas = (cajaGastosData ?? []).map((g) => {
    const monto = Number(g.entregado ?? g.monto ?? 0) - Number(g.vuelto ?? 0);
    const categoria = (g.categoria as string | null) ?? "Sin categoría";
    return {
      fecha: g.fecha as string,
      descripcion: `${categoria} — ${(g.concepto as string | null) ?? (g.nombre as string | null) ?? ""}`,
      monto,
      categoria,
    };
  });
  const cajaMenudaGastos = aSeccion(cajaGastosFilas);
  const cajaMenudaPorCategoria = porCategoria(cajaGastosFilas);

  const comprasGastosFilas = (comprasGastosData ?? []).map((g) => {
    const categoriaCruda = g.categoria as string;
    const etiqueta =
      categoriaCruda === "otro"
        ? ((g.categoria_otro as string | null) ?? "Otro")
        : (CATEGORIA_GASTO_LABEL[categoriaCruda] ?? categoriaCruda);
    const proveedor = (g.proveedores as unknown as { nombre: string } | null)?.nombre ?? "Sin proveedor";
    return {
      fecha: g.fecha as string,
      descripcion: `${etiqueta} — ${proveedor}`,
      monto: Number(g.monto),
      categoria: etiqueta,
    };
  });
  const comprasGastos = aSeccion(comprasGastosFilas);
  const comprasPorCategoria = porCategoria(comprasGastosFilas);

  const acumuladoPlanilla = new Map<string, AcumuladoPersona>();
  for (const p of pagosData ?? []) {
    const nombre = p.colaborador as string;
    const fila: AcumuladoPersona = {
      monto: Number(p.monto),
      bonificacion: Number(p.bonificacion ?? 0),
      decimoTercerMes: Number(p.decimo_tercer_mes ?? 0),
      css: Number(p.css ?? 0),
      seguroEducativo: Number(p.seguro_educativo ?? 0),
      montoPrestamo: Number(p.monto_prestamo ?? 0),
    };
    acumuladoPlanilla.set(nombre, sumarAcumulado(acumuladoPlanilla.get(nombre) ?? acumuladoVacio(), fila));
  }
  const filasPlanilla = Array.from(acumuladoPlanilla.entries())
    .map(([nombre, a]) => aFila(nombre, a))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const planilla = {
    filas: filasPlanilla,
    total: redondear(filasPlanilla.reduce((s, f) => s + f.neto, 0)),
  };
  // "Gasto real de Planilla" para el Resumen -- mismo criterio que ya usa
  // Balance (monto+bonificación+décimo-préstamo; el CSS/Seguro Educativo
  // sigue siendo gasto de la empresa aunque no llegue al colaborador, ver
  // PagoPlanillaBalance en balance/page.tsx).
  const egresosPlanillaBruto = redondear(
    filasPlanilla.reduce((s, f) => s + f.monto + f.bonificacion + f.decimoTercerMes - f.montoPrestamo, 0),
  );

  const prestamos = aSeccion(
    (prestamosData ?? []).map((p) => ({
      fecha: p.fecha as string,
      descripcion: p.colaborador as string,
      monto: Number(p.monto),
    })),
  );

  const egresos = redondear(cajaMenudaGastos.total + comprasGastos.total + egresosPlanillaBruto);
  const resumen = {
    ingresos: ventas.total,
    egresos,
    neto: redondear(ventas.total - egresos),
  };

  return {
    etiquetaPeriodo,
    ventas,
    cajaMenudaReposiciones,
    cajaMenudaGastos,
    cajaMenudaPorCategoria,
    comprasGastos,
    comprasPorCategoria,
    planilla,
    prestamos,
    resumen,
  };
}
