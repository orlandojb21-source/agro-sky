import { createClient } from "@/lib/supabase/server";
import { CajaSubNav } from "@/components/layout/CajaSubNav";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { calcularSaldoActual, DENOMINACIONES, META_CAJA, UMBRAL_ALERTA } from "@/lib/caja";

const MONEDAS = DENOMINACIONES.filter((d) => d.tipo === "moneda").sort((a, b) => a.valor - b.valor);
const BILLETES = DENOMINACIONES.filter((d) => d.tipo === "billete").sort((a, b) => a.valor - b.valor);

export default async function CajaMenudaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [saldo, { data: ultimoArqueo }] = await Promise.all([
    calcularSaldoActual(supabase),
    supabase
      .from("caja_arqueos")
      .select("fecha, detalle, total_contado")
      .order("fecha", { ascending: false })
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const necesitaReposicion = saldo <= UMBRAL_ALERTA;
  const detalle = (ultimoArqueo?.detalle ?? {}) as Record<string, number>;

  return (
    <div className="flex flex-col gap-6">
      {necesitaReposicion && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Es momento de reponer la caja
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
              El saldo está en o por debajo de {formatMoney(UMBRAL_ALERTA)}.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Saldo actual de la caja
            </p>
            <p className="mt-1 text-3xl font-semibold text-green-900 dark:text-green-50">
              {formatMoney(saldo)}
            </p>
            <p className="mt-1 text-xs text-green-700/60 dark:text-green-300/60">
              Meta: {formatMoney(META_CAJA)}
            </p>
          </div>

          <div className="text-center sm:col-span-2">
            {ultimoArqueo ? (
              <>
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                  Arqueo del {formatDateOnly(ultimoArqueo.fecha as string)}
                </p>

                <div className="mt-3 inline-block rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-center dark:border-blue-900/40 dark:bg-blue-950/20">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Total en Efectivo de Caja
                  </p>
                  <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    {formatMoney(Number(ultimoArqueo.total_contado))}
                  </p>
                </div>

                {/* Escritorio: tabla ancha con Monedas/Billetes agrupados */}
                <div className="mt-3 hidden overflow-x-auto sm:block">
                  <table className="mx-auto min-w-[700px] text-center text-xs">
                    <thead>
                      <tr>
                        <th
                          colSpan={MONEDAS.length}
                          className="border border-green-200 bg-green-700 py-1 text-white dark:border-green-800"
                        >
                          Monedas
                        </th>
                        <th
                          colSpan={BILLETES.length}
                          className="border border-green-200 bg-green-800 py-1 text-white dark:border-green-800"
                        >
                          Billetes
                        </th>
                      </tr>
                      <tr className="bg-green-900 text-white">
                        {[...MONEDAS, ...BILLETES].map((d) => (
                          <th
                            key={d.id}
                            className="border border-green-200 px-2 py-1 dark:border-green-800"
                          >
                            {d.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {[...MONEDAS, ...BILLETES].map((d) => (
                          <td
                            key={d.id}
                            className="border border-green-100 px-2 py-1 text-green-900 dark:border-green-900/40 dark:text-green-50"
                          >
                            {formatMoney((detalle[d.id] ?? 0) * d.valor)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Movil: cuadricula compacta en vez de una tabla ancha */}
                <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
                  {[...MONEDAS, ...BILLETES].map((d) => (
                    <div
                      key={d.id}
                      className="rounded-lg border border-green-100 bg-green-50/60 px-2 py-1.5 text-center dark:border-green-900/40 dark:bg-green-950/20"
                    >
                      <p className="text-xs text-green-700/70 dark:text-green-300/70">{d.label}</p>
                      <p className="text-sm font-medium text-green-900 dark:text-green-50">
                        {formatMoney((detalle[d.id] ?? 0) * d.valor)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-green-800/80 dark:text-green-200/80">
                Todavía no se ha hecho un arqueo. Registra uno para ver aquí cuánto efectivo hay
                en la caja por denominación.
              </p>
            )}
          </div>
        </div>
      </div>

      <CajaSubNav />
      {children}
    </div>
  );
}
