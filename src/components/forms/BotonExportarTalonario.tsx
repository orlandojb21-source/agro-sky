"use client";

import { exportarTalonarioPDF, type TalonarioExportable } from "@/lib/exportar";

export function BotonExportarTalonario({ talonario }: { talonario: TalonarioExportable }) {
  return (
    <button
      onClick={() => exportarTalonarioPDF(talonario)}
      className="text-sm text-green-700 hover:underline dark:text-green-300"
    >
      Talonario
    </button>
  );
}
