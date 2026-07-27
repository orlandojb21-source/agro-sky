import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { PagosPlanillaTabla, type PagoFila } from "@/components/forms/PagosPlanillaTabla";
import { calcularTotalesMesActual } from "@/lib/planilla";
import { formatMoney } from "@/lib/format";

type ColaboradorResumen = { nombre: string; salario: number | null };

function TarjetaResumen({
  titulo,
  colaboradores,
  porColaborador,
}: {
  titulo: string;
  colaboradores: ColaboradorResumen[];
  porColaborador: Record<string, number>;
}) {
  return (
    <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
        {titulo}
      </p>
      {colaboradores.length === 0 ? (
        <p className="mt-3 text-sm text-green-700/70 dark:text-green-300/70">
          Todavía no hay colaboradores de este tipo.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {colaboradores.map((c) => (
            <div
              key={c.nombre}
              className="rounded-lg border border-green-100 bg-green-50/60 px-3 py-2 dark:border-green-900/40 dark:bg-green-950/20"
            >
              <p className="text-xs text-green-700/70 dark:text-green-300/70">{c.nombre}</p>
              {c.salario !== null && (
                <p className="text-[11px] text-green-700/50 dark:text-green-300/50">
                  Salario: {formatMoney(c.salario)}
                </p>
              )}
              <p className="text-lg font-semibold text-green-900 dark:text-green-50">
                {formatMoney(porColaborador[c.nombre] ?? 0)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function PlanillaPage() {
  await requireSection("planilla");

  const supabase = await createClient();
  const { data: colaboradoresData } = await supabase
    .from("colaboradores")
    .select("nombre, tipo, salario")
    .order("nombre");
  const colaboradores = (colaboradoresData ?? []).map((c) => ({
    nombre: c.nombre as string,
    tipo: c.tipo as "fijo" | "campo",
    salario: c.salario === null ? null : Number(c.salario),
  }));
  const nombresColaboradores = colaboradores.map((c) => c.nombre);
  const fijos = colaboradores.filter((c) => c.tipo === "fijo");
  const campo = colaboradores.filter((c) => c.tipo === "campo");

  const [totalesMes, { data }] = await Promise.all([
    calcularTotalesMesActual(supabase, nombresColaboradores),
    supabase
      .from("planilla_pagos")
      .select("id, colaborador, fecha, descripcion, monto, tipo_trabajo, jornada")
      .order("fecha", { ascending: false }),
  ]);

  const pagos: PagoFila[] = (data ?? []).map((p) => ({
    id: p.id as string,
    colaborador: p.colaborador as string,
    fecha: p.fecha as string,
    descripcion: p.descripcion as string,
    monto: Number(p.monto),
    tipoTrabajo: p.tipo_trabajo as "proyecto" | "taller" | null,
    jornada: p.jornada as "completo" | "medio" | null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TarjetaResumen
            titulo="Fijos — pagado este mes"
            colaboradores={fijos}
            porColaborador={totalesMes.porColaborador}
          />
          <TarjetaResumen
            titulo="Campo — pagado este mes"
            colaboradores={campo}
            porColaborador={totalesMes.porColaborador}
          />
        </div>
        <div className="inline-block self-start rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-center dark:border-blue-900/40 dark:bg-blue-950/20">
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
          action={
            <div className="flex gap-2">
              <LinkButton href="/planilla/colaboradores" variant="secondary">
                Colaboradores
              </LinkButton>
              <LinkButton href="/planilla/nuevo">+ Nuevo registro</LinkButton>
            </div>
          }
        />
        <PagosPlanillaTabla pagos={pagos} />
      </div>
    </div>
  );
}
