import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { PagosPlanillaTabla, type PagoFila } from "@/components/forms/PagosPlanillaTabla";
import { COLABORADORES, calcularTotalesMesActual } from "@/lib/planilla";
import { formatMoney } from "@/lib/format";

export default async function PlanillaPage() {
  await requireSection("planilla");

  const supabase = await createClient();
  const [totalesMes, { data }] = await Promise.all([
    calcularTotalesMesActual(supabase),
    supabase
      .from("planilla_pagos")
      .select("id, colaborador, fecha, descripcion, monto")
      .order("fecha", { ascending: false }),
  ]);

  const pagos: PagoFila[] = (data ?? []).map((p) => ({
    id: p.id as string,
    colaborador: p.colaborador as string,
    fecha: p.fecha as string,
    descripcion: p.descripcion as string,
    monto: Number(p.monto),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
          Pagado este mes
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLABORADORES.map((c) => (
            <div
              key={c}
              className="rounded-lg border border-green-100 bg-green-50/60 px-3 py-2 dark:border-green-900/40 dark:bg-green-950/20"
            >
              <p className="text-xs text-green-700/70 dark:text-green-300/70">{c}</p>
              <p className="text-lg font-semibold text-green-900 dark:text-green-50">
                {formatMoney(totalesMes.porColaborador[c])}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 inline-block rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-center dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Total pagado este mes
          </p>
          <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {formatMoney(totalesMes.total)}
          </p>
        </div>
      </div>

      <div>
        <PageHeader
          title="Planilla"
          action={<LinkButton href="/planilla/nuevo">+ Nuevo registro</LinkButton>}
        />
        <PagosPlanillaTabla pagos={pagos} />
      </div>
    </div>
  );
}
