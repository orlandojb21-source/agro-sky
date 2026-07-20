import { createClient } from "@/lib/supabase/server";
import { CajaSubNav } from "@/components/layout/CajaSubNav";
import { formatMoney } from "@/lib/format";

const META_CAJA = 500;
const UMBRAL_ALERTA = 150;

export default async function CajaMenudaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [{ data: reposiciones }, { data: gastos }] = await Promise.all([
    supabase.from("caja_reposiciones").select("monto"),
    supabase.from("caja_gastos").select("monto"),
  ]);

  const totalRepuesto = (reposiciones ?? []).reduce((suma, r) => suma + Number(r.monto), 0);
  const totalGastado = (gastos ?? []).reduce((suma, g) => suma + Number(g.monto), 0);
  const saldo = totalRepuesto - totalGastado;
  const necesitaReposicion = saldo <= UMBRAL_ALERTA;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Saldo actual de la caja
          </p>
          <p className="mt-1 text-2xl font-semibold text-green-900 dark:text-green-50">
            {formatMoney(saldo)}
          </p>
          <p className="mt-1 text-xs text-green-700/60 dark:text-green-300/60">
            Meta: {formatMoney(META_CAJA)}
          </p>
        </div>

        {necesitaReposicion ? (
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
        ) : (
          <div className="flex items-center rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <p className="text-sm text-green-800/80 dark:text-green-200/80">
              La caja tiene saldo suficiente.
            </p>
          </div>
        )}
      </div>

      <CajaSubNav />
      {children}
    </div>
  );
}
