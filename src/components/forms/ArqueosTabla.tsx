"use client";

import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarArqueoAction } from "@/lib/actions/caja";
import { formatMoney, formatDate } from "@/lib/format";

export type ArqueoFila = {
  id: string;
  fecha: string;
  totalContado: number;
  saldoEsperado: number;
  diferencia: number;
  nota: string | null;
};

export function ArqueosTabla({
  arqueos,
  puedeEditar,
}: {
  arqueos: ArqueoFila[];
  puedeEditar: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Total contado</th>
              <th className="px-3 py-2 font-medium">Saldo esperado</th>
              <th className="px-3 py-2 font-medium">Diferencia</th>
              <th className="px-3 py-2 font-medium">Nota</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {arqueos.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70"
                >
                  Todavía no hay arqueos registrados.
                </td>
              </tr>
            ) : (
              arqueos.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                >
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatDate(a.fecha)}
                  </td>
                  <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                    {formatMoney(a.totalContado)}
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatMoney(a.saldoEsperado)}
                  </td>
                  <td
                    className={
                      a.diferencia === 0
                        ? "px-3 py-3 font-medium text-green-700 dark:text-green-400"
                        : a.diferencia < 0
                          ? "px-3 py-3 font-medium text-red-700 dark:text-red-400"
                          : "px-3 py-3 font-medium text-amber-700 dark:text-amber-400"
                    }
                  >
                    {formatMoney(a.diferencia)}
                    <span className="ml-2 text-xs font-normal">
                      {a.diferencia === 0 ? "(cuadra)" : a.diferencia < 0 ? "(faltante)" : "(sobrante)"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {a.nota ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {puedeEditar && <DeleteButton action={eliminarArqueoAction.bind(null, a.id)} />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
