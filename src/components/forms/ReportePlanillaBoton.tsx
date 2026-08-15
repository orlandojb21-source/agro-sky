"use client";

import { useState } from "react";
import { obtenerReportePlanillaAction } from "@/lib/actions/planilla";
import { exportarReportePlanillaPDF } from "@/lib/exportar";

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

export function ReportePlanillaBoton({ anioActual, mesActual }: { anioActual: number; mesActual: number }) {
  const [anio, setAnio] = useState(anioActual);
  const [mes, setMes] = useState(mesActual);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anios = [anioActual - 1, anioActual, anioActual + 1];

  async function generarPDF() {
    setGenerando(true);
    setError(null);
    try {
      const reporte = await obtenerReportePlanillaAction(anio, mes);
      await exportarReportePlanillaPDF(reporte);
    } catch {
      setError("No se pudo generar el reporte. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
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
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={generarPDF}
          disabled={generando}
          className="rounded-lg border border-green-300 px-3 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          {generando ? "Generando..." : "Generar PDF de Planilla"}
        </button>
        <span className="text-[11px] text-green-700/60 dark:text-green-300/60">
          Montos netos, ya restado CSS/Seguro Educativo/préstamo.
        </span>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
