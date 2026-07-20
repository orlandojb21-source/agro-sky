"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  exportarMovimientosExcel,
  exportarMovimientosPDF,
  type MovimientoExportable,
} from "@/lib/exportar";
import { formatMoney } from "@/lib/format";

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

export function BalanceDashboard({ movimientos }: { movimientos: MovimientoExportable[] }) {
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

  const filtrados = useMemo(() => {
    if (!listo) return [];
    return movimientos.filter((m) => {
      if (fechaDesde && m.fecha < fechaDesde) return false;
      if (fechaHasta && m.fecha > fechaHasta) return false;
      return true;
    });
  }, [movimientos, fechaDesde, fechaHasta, listo]);

  const totalReposiciones = filtrados
    .filter((m) => m.tipo === "reposicion")
    .reduce((suma, m) => suma + m.monto, 0);
  const totalGastos = filtrados
    .filter((m) => m.tipo === "gasto")
    .reduce((suma, m) => suma + m.monto, 0);

  const datosGrafica = [
    { nombre: "Reposiciones", monto: totalReposiciones, color: "#16a34a" },
    { nombre: "Gastos", monto: totalGastos, color: "#dc2626" },
  ];

  const hayDatos = listo && filtrados.length > 0;
  const nombreArchivo = `agro-sky-balance-caja-menuda-${periodo}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="mb-4 text-lg font-semibold text-green-900 dark:text-green-50">Caja Menuda</h2>

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

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => exportarMovimientosExcel(filtrados, nombreArchivo)}
              disabled={!hayDatos}
              className="rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
            >
              Exportar Excel
            </button>
            <button
              onClick={() =>
                exportarMovimientosPDF(filtrados, nombreArchivo, "Balance — Caja Menuda")
              }
              disabled={!hayDatos}
              className="rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
            >
              Exportar PDF
            </button>
          </div>
        </div>

        {!hayDatos ? (
          <p className="mt-6 text-sm text-green-700/70 dark:text-green-300/70">
            {periodo === "rango" && !listo
              ? "Selecciona una fecha de inicio y una de fin."
              : "No hay movimientos para este período."}
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
                  {formatMoney(totalGastos)}
                </p>
              </div>
            </div>

            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGrafica}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis tickFormatter={(v: number) => formatMoney(v)} width={90} />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Bar dataKey="monto">
                    {datosGrafica.map((d) => (
                      <Cell key={d.nombre} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
