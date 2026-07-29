"use client";

import { exportarInformeProyectoPDF, type InformeProyectoExportable } from "@/lib/exportar";

export function BotonExportarInforme({ informe }: { informe: InformeProyectoExportable }) {
  return (
    <button
      onClick={() => exportarInformeProyectoPDF(informe)}
      className="rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
    >
      Exportar PDF
    </button>
  );
}
