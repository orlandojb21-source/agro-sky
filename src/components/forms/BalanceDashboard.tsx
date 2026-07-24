"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  exportarMovimientosExcel,
  exportarMovimientosPDF,
  type MovimientoExportable,
} from "@/lib/exportar";
import { formatMoney } from "@/lib/format";
import { COLABORADORES } from "@/lib/planilla";

type Periodo = "semana" | "mes" | "año" | "vida" | "rango";

const OPCIONES_PERIODO: { valor: Periodo; label: string }[] = [
  { valor: "semana", label: "Semana Actual" },
  { valor: "mes", label: "Mes" },
  { valor: "año", label: "Año" },
  { valor: "vida", label: "Vida Completa" },
  { valor: "rango", label: "Seleccione fecha" },
];

// Fecha local en formato "YYYY-MM-DD" -- deliberadamente NO usa
// toISOString() (que convierte a UTC y puede correr la fecha un dia, el
// mismo bug que se corrigio en formatDateOnly()).
function aISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

function inicioSemana(hoy: Date): Date {
  const d = new Date(hoy);
  const dia = d.getDay();
  const diff = (dia === 0 ? -6 : 1) - dia; // retrocede al lunes
  d.setDate(d.getDate() + diff);
  return d;
}

// El ingreso real de una venta es subtotal_gravado + subtotal_exento -- el
// ITBMS cobrado NO cuenta como ingreso del negocio (es dinero que se cobra
// para el gobierno, no ganancia de Agro Sky), se muestra solo como
// referencia aparte.
export type VentaBalance = {
  fecha: string;
  ingreso: number;
  itbms: number;
};

export type PagoPlanillaBalance = {
  fecha: string;
  colaborador: string;
  monto: number;
};

type BarraDatos = { nombre: string; monto: number; color: string };

function GraficaDosBarras({ datos }: { datos: BarraDatos[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nombre" />
          <YAxis tickFormatter={(v: number) => formatMoney(v)} width={90} />
          <Tooltip formatter={(value) => formatMoney(Number(value))} />
          <Bar dataKey="monto">
            <LabelList
              dataKey="monto"
              position="top"
              formatter={(value) => formatMoney(Number(value))}
              style={{ fontWeight: 600 }}
            />
            {datos.map((d) => (
              <Cell key={d.nombre} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BalanceDashboard({
  movimientos,
  ventas,
  pagosPlanilla,
}: {
  movimientos: MovimientoExportable[];
  ventas: VentaBalance[];
  pagosPlanilla: PagoPlanillaBalance[];
}) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const { fechaDesde, fechaHasta, listo } = useMemo(() => {
    const hoy = new Date();
    switch (periodo) {
      case "semana": {
        const inicio = inicioSemana(hoy);
        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + 6);
        return { fechaDesde: aISO(inicio), fechaHasta: aISO(fin), listo: true };
      }
      case "mes": {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        return { fechaDesde: aISO(inicio), fechaHasta: aISO(fin), listo: true };
      }
      case "año": {
        const inicio = new Date(hoy.getFullYear(), 0, 1);
        const fin = new Date(hoy.getFullYear(), 11, 31);
        return { fechaDesde: aISO(inicio), fechaHasta: aISO(fin), listo: true };
      }
      case "rango":
        return { fechaDesde: desde, fechaHasta: hasta, listo: Boolean(desde && hasta) };
      case "vida":
        return { fechaDesde: "", fechaHasta: "", listo: true };
    }
  }, [periodo, desde, hasta]);

  const movimientosFiltrados = useMemo(() => {
    if (!listo) return [];
    return movimientos.filter((m) => {
      if (fechaDesde && m.fecha < fechaDesde) return false;
      if (fechaHasta && m.fecha > fechaHasta) return false;
      return true;
    });
  }, [movimientos, fechaDesde, fechaHasta, listo]);

  const ventasFiltradas = useMemo(() => {
    if (!listo) return [];
    return ventas.filter((v) => {
      if (fechaDesde && v.fecha < fechaDesde) return false;
      if (fechaHasta && v.fecha > fechaHasta) return false;
      return true;
    });
  }, [ventas, fechaDesde, fechaHasta, listo]);

  const pagosFiltrados = useMemo(() => {
    if (!listo) return [];
    return pagosPlanilla.filter((p) => {
      if (fechaDesde && p.fecha < fechaDesde) return false;
      if (fechaHasta && p.fecha > fechaHasta) return false;
      return true;
    });
  }, [pagosPlanilla, fechaDesde, fechaHasta, listo]);

  const totalReposiciones = movimientosFiltrados
    .filter((m) => m.tipo === "reposicion")
    .reduce((suma, m) => suma + m.monto, 0);
  const totalGastosCaja = movimientosFiltrados
    .filter((m) => m.tipo === "gasto")
    .reduce((suma, m) => suma + m.monto, 0);
  const totalVentas = ventasFiltradas.reduce((suma, v) => suma + v.ingreso, 0);
  const totalItbms = ventasFiltradas.reduce((suma, v) => suma + v.itbms, 0);
  const totalPlanilla = pagosFiltrados.reduce((suma, p) => suma + p.monto, 0);

  const totalIngresos = totalReposiciones + totalVentas;
  const totalEgresos = totalGastosCaja + totalPlanilla;
  const gananciaNeta = totalIngresos - totalEgresos;

  const totalesPorColaborador = COLABORADORES.map((c) => ({
    nombre: c,
    monto: pagosFiltrados.filter((p) => p.colaborador === c).reduce((suma, p) => suma + p.monto, 0),
  }));

  const hayDatosCaja = listo && movimientosFiltrados.length > 0;
  const hayAlgunDato =
    listo && (movimientosFiltrados.length > 0 || ventasFiltradas.length > 0 || pagosFiltrados.length > 0);
  const nombreArchivoCaja = `agro-sky-balance-caja-menuda-${periodo}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
            Período
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
            >
              {OPCIONES_PERIODO.map((op) => (
                <option key={op.valor} value={op.valor}>
                  {op.label}
                </option>
              ))}
            </select>
          </label>

          {periodo === "rango" && (
            <>
              <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
                Desde
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
                Hasta
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
                />
              </label>
            </>
          )}
        </div>
      </div>

      {!listo ? (
        <p className="text-sm text-green-700/70 dark:text-green-300/70">
          Selecciona una fecha de inicio y una de fin.
        </p>
      ) : !hayAlgunDato ? (
        <p className="text-sm text-green-700/70 dark:text-green-300/70">
          No hay movimientos de dinero para este período.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <h2 className="mb-4 text-lg font-semibold text-green-900 dark:text-green-50">
              Resumen general — todo lo que entra y sale
            </h2>

            <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                  Ingresos
                </p>
                <p className="text-xl font-semibold text-green-700 dark:text-green-400">
                  {formatMoney(totalIngresos)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                  Egresos
                </p>
                <p className="text-xl font-semibold text-red-700 dark:text-red-400">
                  {formatMoney(totalEgresos)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                  Ganancia neta
                </p>
                <p
                  className={
                    gananciaNeta >= 0
                      ? "text-xl font-semibold text-green-700 dark:text-green-400"
                      : "text-xl font-semibold text-red-700 dark:text-red-400"
                  }
                >
                  {formatMoney(gananciaNeta)}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <GraficaDosBarras
                datos={[
                  { nombre: "Ingresos", monto: totalIngresos, color: "#16a34a" },
                  { nombre: "Egresos", monto: totalEgresos, color: "#dc2626" },
                ]}
              />
            </div>

            <p className="mt-3 text-xs text-green-700/60 dark:text-green-300/60">
              Ingresos = Ventas (sin ITBMS) + Reposiciones de Caja Menuda. Egresos = Gastos de Caja
              Menuda + Planilla.
              {totalItbms > 0
                ? ` ITBMS cobrado en ventas de este período (no incluido arriba, se le debe al gobierno): ${formatMoney(totalItbms)}.`
                : ""}
            </p>
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Caja Menuda</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => exportarMovimientosExcel(movimientosFiltrados, nombreArchivoCaja)}
                  disabled={!hayDatosCaja}
                  className="rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
                >
                  Exportar Excel
                </button>
                <button
                  onClick={() =>
                    exportarMovimientosPDF(movimientosFiltrados, nombreArchivoCaja, "Balance — Caja Menuda")
                  }
                  disabled={!hayDatosCaja}
                  className="rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
                >
                  Exportar PDF
                </button>
              </div>
            </div>

            {!hayDatosCaja ? (
              <p className="mt-4 text-sm text-green-700/70 dark:text-green-300/70">
                No hay movimientos de Caja Menuda para este período.
              </p>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                      Reposiciones
                    </p>
                    <p className="text-xl font-semibold text-green-700 dark:text-green-400">
                      {formatMoney(totalReposiciones)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                      Gastos
                    </p>
                    <p className="text-xl font-semibold text-red-700 dark:text-red-400">
                      {formatMoney(totalGastosCaja)}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <GraficaDosBarras
                    datos={[
                      { nombre: "Reposiciones", monto: totalReposiciones, color: "#16a34a" },
                      { nombre: "Gastos", monto: totalGastosCaja, color: "#dc2626" },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Ventas</h2>

            {ventasFiltradas.length === 0 ? (
              <p className="mt-4 text-sm text-green-700/70 dark:text-green-300/70">
                No hay ventas para este período.
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Total de ventas
                  </p>
                  <p className="text-xl font-semibold text-green-700 dark:text-green-400">
                    {formatMoney(totalVentas)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    ITBMS cobrado
                  </p>
                  <p className="text-xl font-semibold text-green-900 dark:text-green-50">
                    {formatMoney(totalItbms)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Total facturado
                  </p>
                  <p className="text-xl font-semibold text-green-900 dark:text-green-50">
                    {formatMoney(totalVentas + totalItbms)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Ventas registradas
                  </p>
                  <p className="text-xl font-semibold text-green-900 dark:text-green-50">
                    {ventasFiltradas.length}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Planilla</h2>

            {pagosFiltrados.length === 0 ? (
              <p className="mt-4 text-sm text-green-700/70 dark:text-green-300/70">
                No hay pagos de planilla para este período.
              </p>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {totalesPorColaborador.map((c) => (
                    <div key={c.nombre}>
                      <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                        {c.nombre}
                      </p>
                      <p className="text-lg font-semibold text-green-900 dark:text-green-50">
                        {formatMoney(c.monto)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 inline-block rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-center dark:border-red-900/40 dark:bg-red-950/20">
                  <p className="text-xs font-medium uppercase tracking-wide text-red-700 dark:text-red-400">
                    Total pagado en planilla
                  </p>
                  <p className="text-lg font-semibold text-red-900 dark:text-red-100">
                    {formatMoney(totalPlanilla)}
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
