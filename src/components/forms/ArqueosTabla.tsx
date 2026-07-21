"use client";

import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarArqueoAction } from "@/lib/actions/caja";
import { formatMoney, formatDateOnly } from "@/lib/format";

export type ArqueoFila = {
  id: string;
  fecha: string;
  totalContado: number;
  saldoEsperado: number;
  diferencia: number;
  nota: string | null;
};

function etiquetaDiferencia(diferencia: number): string {
  if (diferencia === 0) return "(cuadra)";
  return diferencia < 0 ? "(faltante)" : "(sobrante)";
}

function claseDiferencia(diferencia: number): string {
  if (diferencia === 0) return "text-green-700 dark:text-green-400";
  return diferencia < 0 ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400";
}

export function ArqueosTabla({ arqueos }: { arqueos: ArqueoFila[] }) {
  if (arqueos.length === 0) {
    return (
      <div className="rounded-xl border border-green-100 bg-white p-10 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
        Todavía no hay arqueos registrados.
      </div>
    );
  }

  return (
    <>
      {/* Vista de escritorio */}
      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
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
              {arqueos.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                >
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatDateOnly(a.fecha)}
                  </td>
                  <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                    {formatMoney(a.totalContado)}
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatMoney(a.saldoEsperado)}
                  </td>
                  <td className={`px-3 py-3 font-medium ${claseDiferencia(a.diferencia)}`}>
                    {formatMoney(a.diferencia)}
                    <span className="ml-2 text-xs font-normal">
                      {etiquetaDiferencia(a.diferencia)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {a.nota ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <DeleteButton action={eliminarArqueoAction.bind(null, a.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista de movil: una tarjeta por arqueo */}
      <div className="flex flex-col gap-3 sm:hidden">
        {arqueos.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-green-700/60 dark:text-green-300/60">
                  {formatDateOnly(a.fecha)}
                </p>
                <p className="font-medium text-green-900 dark:text-green-50">
                  {formatMoney(a.totalContado)}
                </p>
              </div>
              <p className={`text-right text-sm font-medium ${claseDiferencia(a.diferencia)}`}>
                {formatMoney(a.diferencia)}
                <br />
                <span className="text-xs font-normal">{etiquetaDiferencia(a.diferencia)}</span>
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                  Saldo esperado
                </p>
                <p className="text-green-900 dark:text-green-50">
                  {formatMoney(a.saldoEsperado)}
                </p>
              </div>
              {a.nota && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Nota
                  </p>
                  <p className="text-green-900 dark:text-green-50">{a.nota}</p>
                </div>
              )}
            </div>

            <div className="mt-3 flex border-t border-green-50 pt-3 dark:border-green-900/30">
              <DeleteButton action={eliminarArqueoAction.bind(null, a.id)} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
