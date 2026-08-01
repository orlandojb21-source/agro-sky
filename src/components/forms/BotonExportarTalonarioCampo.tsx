"use client";

import { exportarTalonarioCampoPDF, type TalonarioCampoExportable } from "@/lib/exportar";

export function BotonExportarTalonarioCampo({ talonario }: { talonario: TalonarioCampoExportable }) {
  return (
    <button
      onClick={() => exportarTalonarioCampoPDF(talonario)}
      className="text-sm text-green-700 hover:underline dark:text-green-300"
    >
      Talonario
    </button>
  );
}
