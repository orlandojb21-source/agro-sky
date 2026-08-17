"use client";

import { useState } from "react";
import { exportarMovimientosPDF, type MovimientoExportable } from "@/lib/exportar";
import { formatDateOnly } from "@/lib/format";

export function BotonExportarDesdeReposicion({
  movimientos,
  fechaUltimaReposicion,
}: {
  movimientos: MovimientoExportable[];
  fechaUltimaReposicion: string | null;
}) {
  const [generando, setGenerando] = useState(false);

  if (!fechaUltimaReposicion) return null;
  const fecha = fechaUltimaReposicion;

  async function exportar() {
    setGenerando(true);
    try {
      await exportarMovimientosPDF(
        movimientos,
        "agro-sky-caja-menuda-desde-reposicion",
        `Caja Menuda — Movimientos desde la última reposición (${formatDateOnly(fecha)})`,
      );
    } finally {
      setGenerando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={generando}
      className="inline-block rounded-full border border-green-200 px-5 py-2.5 text-sm font-medium text-green-900 shadow-sm transition hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-100 dark:hover:bg-green-950/40"
    >
      {generando ? "Generando..." : "Exportar PDF (desde última reposición)"}
    </button>
  );
}
