"use client";

import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarPrevistoAction, registrarVueltoAction } from "@/lib/actions/caja";
import { formatMoney, formatDate } from "@/lib/format";

export type PrevistoFila = {
  id: string;
  fecha: string;
  colaborador: string;
  previsto: number;
  entregado: number;
  vuelto: number | null;
  real: number;
  diferencia: number;
};

export function PrevistosTabla({
  previstos,
  puedeEliminar,
}: {
  previstos: PrevistoFila[];
  puedeEliminar: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead>
            <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Colaborador</th>
              <th className="px-3 py-2 font-medium">Previsto</th>
              <th className="px-3 py-2 font-medium">Entregado</th>
              <th className="px-3 py-2 font-medium">Vuelto</th>
              <th className="px-3 py-2 font-medium">Real</th>
              <th className="px-3 py-2 font-medium">Diferencia</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {previstos.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70"
                >
                  Todavía no hay previstos asignados.
                </td>
              </tr>
            ) : (
              previstos.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                >
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatDate(p.fecha)}
                  </td>
                  <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                    {p.colaborador}
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatMoney(p.previsto)}
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatMoney(p.entregado)}
                  </td>
                  <td className="px-3 py-3">
                    {p.vuelto !== null ? (
                      <span className="text-green-800/80 dark:text-green-200/80">
                        {formatMoney(p.vuelto)}
                      </span>
                    ) : puedeEliminar ? (
                      <form
                        action={registrarVueltoAction.bind(null, p.id)}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="number"
                          name="vuelto"
                          min={0}
                          step="0.01"
                          required
                          placeholder="0.00"
                          className="w-20 rounded-md border border-green-200 bg-white px-2 py-1 text-xs text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50"
                        />
                        <button
                          type="submit"
                          className="text-xs text-green-700 hover:underline dark:text-green-300"
                        >
                          Registrar
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-green-700/60 dark:text-green-300/60">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatMoney(p.real)}
                  </td>
                  <td
                    className={
                      p.diferencia > 0
                        ? "px-3 py-3 font-medium text-red-700 dark:text-red-400"
                        : p.diferencia < 0
                          ? "px-3 py-3 font-medium text-green-700 dark:text-green-400"
                          : "px-3 py-3 text-green-800/80 dark:text-green-200/80"
                    }
                  >
                    {p.diferencia > 0 ? "+" : ""}
                    {formatMoney(p.diferencia)}
                    {p.diferencia > 0 && (
                      <span className="ml-2 text-xs font-normal">(se gastó de más)</span>
                    )}
                    {p.diferencia < 0 && (
                      <span className="ml-2 text-xs font-normal">(sobró)</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {puedeEliminar && (
                      <DeleteButton action={eliminarPrevistoAction.bind(null, p.id)} />
                    )}
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
