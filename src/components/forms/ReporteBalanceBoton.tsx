"use client";

import { useState } from "react";
import { obtenerReporteBalanceCompletoAction } from "@/lib/actions/balance";
import { exportarReporteBalanceCompletoPDF } from "@/lib/exportar";

const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const CLASE_SELECT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function ReporteBalanceBoton({ anioActual, mesActual }: { anioActual: number; mesActual: number }) {
  const [tipo, setTipo] = useState<"mensual" | "anual">("mensual");
  const [anio, setAnio] = useState(anioActual);
  const [mes, setMes] = useState(mesActual);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anios = [anioActual - 1, anioActual, anioActual + 1];

  async function generarPDF() {
    setGenerando(true);
    setError(null);
    try {
      const reporte = await obtenerReporteBalanceCompletoAction(anio, tipo === "anual" ? null : mes);
      await exportarReporteBalanceCompletoPDF(reporte);
    } catch {
      setError("No se pudo generar el reporte. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
      <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Reporte completo de Balance</h2>
      <p className="mt-1 text-sm text-green-700/70 dark:text-green-300/70">
        Un solo PDF con el detalle de Ventas, Caja Menuda, Compras, Planilla y Préstamos del período elegido.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
          Período
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "mensual" | "anual")}
            className={CLASE_SELECT}
          >
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
          Año
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={CLASE_SELECT}>
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        {tipo === "mensual" && (
          <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
            Mes
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={CLASE_SELECT}>
              {NOMBRES_MES.map((nombre, i) => (
                <option key={nombre} value={i + 1}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={generarPDF}
          disabled={generando}
          className="rounded-lg border border-green-300 px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          {generando ? "Generando..." : "Generar PDF de Balance"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
