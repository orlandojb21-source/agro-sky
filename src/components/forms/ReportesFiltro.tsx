"use client";

import { useMemo, useState } from "react";
import {
  exportarMovimientosExcel,
  exportarMovimientosPDF,
  type MovimientoExportable,
} from "@/lib/exportar";

type Periodo = "semana" | "mes" | "año" | "rango" | "todo";

const OPCIONES_PERIODO: { valor: Periodo; label: string }[] = [
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mes" },
  { valor: "año", label: "Este año" },
  { valor: "rango", label: "Selección de fecha" },
  { valor: "todo", label: "Vida completa" },
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

export function ReportesFiltro({ movimientos }: { movimientos: MovimientoExportable[] }) {
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
      case "todo":
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

  const hayDatos = listo && filtrados.length > 0;
  const nombreArchivo = `agro-sky-reportes-caja-menuda-${periodo}`;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
      <div>
        <p className="mb-2 text-sm font-medium text-green-900 dark:text-green-100">Período</p>
        <div className="flex flex-wrap gap-2">
          {OPCIONES_PERIODO.map((op) => (
            <button
              key={op.valor}
              onClick={() => setPeriodo(op.valor)}
              className={
                periodo === op.valor
                  ? "rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                  : "rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
              }
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {periodo === "rango" && (
        <div className="flex flex-wrap gap-3">
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
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => exportarMovimientosExcel(filtrados, nombreArchivo)}
          disabled={!hayDatos}
          className="rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          Exportar Excel
        </button>
        <button
          onClick={() =>
            exportarMovimientosPDF(filtrados, nombreArchivo, "Reporte de Caja Menuda")
          }
          disabled={!hayDatos}
          className="rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          Exportar PDF
        </button>
      </div>
      {!hayDatos && (
        <p className="text-xs text-green-700/60 dark:text-green-300/60">
          {periodo === "rango" && !listo
            ? "Selecciona una fecha de inicio y una de fin."
            : "No hay movimientos para exportar en este período."}
        </p>
      )}
    </div>
  );
}
