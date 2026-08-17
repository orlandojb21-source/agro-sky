import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { esSoporteOJefe, canWrite } from "@/lib/roles";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { PagosPlanillaTabla, type PagoFila } from "@/components/forms/PagosPlanillaTabla";
import { ReportePlanillaBoton } from "@/components/forms/ReportePlanillaBoton";
import { calcularTotalesMesActual } from "@/lib/planilla";
import { formatMoney } from "@/lib/format";
import type { DetalleTalonarioCampo } from "@/lib/exportar";

type ColaboradorResumen = { nombre: string; salario: number | null; bonificacion: number | null };

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
                  Salario: {formatMoney(c.salario + (c.bonificacion ?? 0))}
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

export default async function PagosPlanillaPage() {
  const perfil = await requireSection("planilla");
  // El administrador gestiona pagos de Campo (no de Fijo, eso sigue siendo
  // exclusivo de jefe/soporte) -- reforzado a nivel de RLS (migración
  // 0049), así que la consulta de abajo ya le devuelve solo pagos de Campo
  // sin necesidad de filtrar nada aquí. Gerente es de solo lectura a todo
  // (ver SECTION_ACCESS) -- la tabla planilla_pagos ya es 100% legible por
  // cualquier rol vía RLS (migración 0034: "Todos los roles SIGUEN VIENDO
  // toda la planilla sin restriccion"), así que esta tarjeta también le
  // corresponde.
  const puedeVerFijos = esSoporteOJefe(perfil.rol) || perfil.rol === "gerente";
  const puedeEscribir = canWrite(perfil.rol, "planilla");

  const supabase = await createClient();
  const { data: colaboradoresData } = await supabase
    .from("colaboradores")
    .select("nombre, tipo, salario, bonificacion")
    .order("nombre");
  const colaboradores = (colaboradoresData ?? []).map((c) => ({
    nombre: c.nombre as string,
    tipo: c.tipo as "fijo" | "campo",
    salario: c.salario === null ? null : Number(c.salario),
    bonificacion: c.bonificacion === null ? null : Number(c.bonificacion),
  }));
  const nombresColaboradores = colaboradores.map((c) => c.nombre);
  const fijos = colaboradores.filter((c) => c.tipo === "fijo");
  const campo = colaboradores.filter((c) => c.tipo === "campo");
  const tipoPorColaborador = new Map(colaboradores.map((c) => [c.nombre, c.tipo]));

  const [totalesMes, { data }] = await Promise.all([
    calcularTotalesMesActual(supabase, nombresColaboradores),
    supabase
      .from("planilla_pagos")
      .select(
        "id, colaborador, fecha, fecha_desde, descripcion, monto, tipo_trabajo, jornada, css, seguro_educativo, bonificacion, decimo_tercer_mes, monto_prestamo, detalle_calculo",
      )
      .order("fecha", { ascending: false }),
  ]);

  const pagos: PagoFila[] = (data ?? []).map((p) => {
    const tipoTrabajo = p.tipo_trabajo as "proyecto" | "oficina" | null;
    const jornada = p.jornada as "completo" | "medio" | "proyecto" | null;
    // Si el colaborador ya no existe en la tabla administrable, se infiere
    // el tipo a partir de si el pago tiene tipoTrabajo/jornada/fechaDesde
    // guardados (mismo criterio que PagoPlanillaForm para colaboradores
    // eliminados).
    const esDeCampo = Boolean(tipoTrabajo || jornada || p.fecha_desde);
    const tipo = tipoPorColaborador.get(p.colaborador as string) ?? (esDeCampo ? "campo" : "fijo");
    return {
      id: p.id as string,
      colaborador: p.colaborador as string,
      fecha: p.fecha as string,
      fechaDesde: p.fecha_desde as string | null,
      descripcion: p.descripcion as string,
      monto: Number(p.monto),
      tipoTrabajo,
      jornada,
      esFijo: tipo === "fijo",
      css: p.css === null ? null : Number(p.css),
      seguroEducativo: p.seguro_educativo === null ? null : Number(p.seguro_educativo),
      bonificacion: p.bonificacion === null ? null : Number(p.bonificacion),
      decimoTercerMes: p.decimo_tercer_mes === null ? null : Number(p.decimo_tercer_mes),
      montoPrestamo: p.monto_prestamo === null ? null : Number(p.monto_prestamo),
      detalleCalculo: p.detalle_calculo as DetalleTalonarioCampo[] | null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className={`grid grid-cols-1 gap-4 ${puedeVerFijos ? "lg:grid-cols-2" : ""}`}>
          {puedeVerFijos && (
            <TarjetaResumen
              titulo="Fijos — pagado este mes"
              colaboradores={fijos}
              porColaborador={totalesMes.porColaborador}
            />
          )}
          <TarjetaResumen
            titulo="Campo — pagado este mes"
            colaboradores={campo}
            porColaborador={totalesMes.porColaborador}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-block self-start rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-center dark:border-blue-900/40 dark:bg-blue-950/20">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Total pagado este mes
            </p>
            <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              {formatMoney(totalesMes.total)}
            </p>
          </div>
          <ReportePlanillaBoton
            anioActual={Number(totalesMes.fechaDesde.slice(0, 4))}
            mesActual={Number(totalesMes.fechaDesde.slice(5, 7))}
          />
        </div>
      </div>

      <div>
        <PageHeader
          title="Pagos"
          action={
            <div className="flex gap-2">
              <LinkButton href="/planilla/colaboradores" variant="secondary">
                Colaboradores
              </LinkButton>
              {puedeEscribir && <LinkButton href="/planilla/pagos/nuevo">+ Nuevo pago</LinkButton>}
            </div>
          }
        />
        <PagosPlanillaTabla pagos={pagos} puedeEscribir={puedeEscribir} />
      </div>
    </div>
  );
}
