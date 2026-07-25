import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarInformeProyectoAction } from "@/lib/actions/proyectos";
import { BotonesExportarProyecto } from "@/components/forms/BotonesExportarProyecto";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { ETIQUETA_SLOT, SLOTS_OPERACION, type SlotOperacion } from "@/lib/proyectos";
import type { InformeProyectoExportable, OperacionExportable } from "@/lib/exportar";

type TramoFila = { hectareas: number; precio: number; subtotal: number };
type OperacionFila = {
  slot: SlotOperacion;
  operador: string | null;
  diesel: number;
  gasolina: number;
  viaticos: number;
  planilla: number;
  alquiler_drone: number;
  alquiler_carro: number;
  lavado_carro: number;
  proyecto_tramos: TramoFila[] | null;
};
type PersonalFila = { nombre: string; rol: string; fecha: string; monto: number };

function totales(op: OperacionExportable) {
  const hectareas = op.tramos.reduce((s, t) => s + t.hectareas, 0);
  const monto = op.tramos.reduce((s, t) => s + t.subtotal, 0);
  const gastos =
    op.diesel + op.gasolina + op.viaticos + op.planilla + op.alquilerDrone + op.alquilerCarro + op.lavadoCarro;
  const ganancia = monto - gastos;
  const pctGanancia = monto > 0 ? ganancia / monto : 0;
  const pctGastos = monto > 0 ? gastos / monto : 0;
  const promedioGastoHa = hectareas > 0 ? gastos / hectareas : 0;
  return { hectareas, monto, gastos, ganancia, pctGanancia, pctGastos, promedioGastoHa };
}

export default async function DetalleInformeProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("proyectos");

  const supabase = await createClient();
  const [{ data: informe }, { data: operacionesData }, { data: personalData }] = await Promise.all([
    supabase
      .from("proyecto_informes")
      .select("id, proyecto, ubicacion, fecha_desde, fecha_hasta, precio_referencia")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("proyecto_operaciones")
      .select(
        "slot, operador, diesel, gasolina, viaticos, planilla, alquiler_drone, alquiler_carro, lavado_carro, proyecto_tramos ( hectareas, precio, subtotal )",
      )
      .eq("informe_id", id),
    supabase
      .from("proyecto_personal_dias")
      .select("nombre, rol, fecha, monto")
      .eq("informe_id", id)
      .order("nombre")
      .order("fecha"),
  ]);

  if (!informe) notFound();

  const operacionesPorSlot = new Map(
    ((operacionesData ?? []) as unknown as OperacionFila[]).map((op) => [op.slot, op]),
  );

  const operaciones: OperacionExportable[] = SLOTS_OPERACION.map((slot) => {
    const fila = operacionesPorSlot.get(slot);
    return {
      etiqueta: ETIQUETA_SLOT[slot],
      operador: fila?.operador ?? null,
      tramos: (fila?.proyecto_tramos ?? []).map((t) => ({
        hectareas: Number(t.hectareas),
        precio: Number(t.precio),
        subtotal: Number(t.subtotal),
      })),
      diesel: Number(fila?.diesel ?? 0),
      gasolina: Number(fila?.gasolina ?? 0),
      viaticos: Number(fila?.viaticos ?? 0),
      planilla: Number(fila?.planilla ?? 0),
      alquilerDrone: Number(fila?.alquiler_drone ?? 0),
      alquilerCarro: Number(fila?.alquiler_carro ?? 0),
      lavadoCarro: Number(fila?.lavado_carro ?? 0),
    };
  });

  const personal = ((personalData ?? []) as unknown as PersonalFila[]).map((p) => ({
    nombre: p.nombre,
    rol: p.rol,
    fecha: p.fecha,
    monto: Number(p.monto),
  }));

  const informeExportable: InformeProyectoExportable = {
    proyecto: informe.proyecto as string,
    ubicacion: informe.ubicacion as string | null,
    fechaDesde: informe.fecha_desde as string,
    fechaHasta: informe.fecha_hasta as string,
    precioReferencia: informe.precio_referencia === null ? null : Number(informe.precio_referencia),
    operaciones,
    personal,
  };

  const totalInforme = operaciones.reduce(
    (acc, op) => {
      const t = totales(op);
      return {
        hectareas: acc.hectareas + t.hectareas,
        monto: acc.monto + t.monto,
        gastos: acc.gastos + t.gastos,
        ganancia: acc.ganancia + t.ganancia,
      };
    },
    { hectareas: 0, monto: 0, gastos: 0, ganancia: 0 },
  );

  // Personal agrupado por persona (nombre+rol) para mostrar un total por
  // fila, en vez de una fila suelta por cada dia.
  const personalAgrupado = Array.from(
    personal
      .reduce((mapa, p) => {
        const clave = `${p.nombre}|${p.rol}`;
        const actual = mapa.get(clave) ?? { nombre: p.nombre, rol: p.rol, dias: [] as PersonalFila[] };
        actual.dias.push(p);
        mapa.set(clave, actual);
        return mapa;
      }, new Map<string, { nombre: string; rol: string; dias: PersonalFila[] }>())
      .values(),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
            {informe.proyecto as string}
          </h1>
          <p className="mt-1 text-sm text-green-700/70 dark:text-green-200/70">
            {informe.ubicacion ? `${informe.ubicacion as string} — ` : ""}
            {formatDateOnly(informe.fecha_desde as string)} al {formatDateOnly(informe.fecha_hasta as string)}
            {informe.precio_referencia !== null
              ? ` — Precio de referencia: ${formatMoney(Number(informe.precio_referencia))}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonesExportarProyecto informe={informeExportable} />
          <LinkButton href="/proyectos" variant="secondary">
            Volver
          </LinkButton>
        </div>
      </div>

      {operaciones.map((op) => {
        const t = totales(op);
        return (
          <div
            key={op.etiqueta}
            className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
          >
            <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">
              {op.etiqueta}
              {op.operador ? ` (${op.operador})` : ""}
            </h2>

            {op.tramos.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full max-w-md text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                      <th className="py-1 font-medium">Hectáreas</th>
                      <th className="py-1 font-medium">Precio</th>
                      <th className="py-1 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op.tramos.map((tramo, i) => (
                      <tr key={i} className="border-t border-green-50 dark:border-green-900/30">
                        <td className="py-1 text-green-800/80 dark:text-green-200/80">{tramo.hectareas}</td>
                        <td className="py-1 text-green-800/80 dark:text-green-200/80">
                          {formatMoney(tramo.precio)}
                        </td>
                        <td className="py-1 font-medium text-green-900 dark:text-green-50">
                          {formatMoney(tramo.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["Diésel", op.diesel],
                ["Gasolina 91", op.gasolina],
                ["Viáticos", op.viaticos],
                ["Planilla", op.planilla],
                ["Alquiler Drone", op.alquilerDrone],
                ["Alquiler Carro", op.alquilerCarro],
                ["Lavado de Carro", op.lavadoCarro],
              ].map(([etiqueta, monto]) => (
                <div key={etiqueta as string}>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    {etiqueta}
                  </p>
                  <p className="text-green-900 dark:text-green-50">{formatMoney(monto as number)}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-green-100 bg-green-50/60 p-3 text-sm sm:grid-cols-6 dark:border-green-900/40 dark:bg-green-950/20">
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Ha</p>
                <p className="font-medium text-green-900 dark:text-green-50">{t.hectareas}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Monto</p>
                <p className="font-medium text-green-900 dark:text-green-50">{formatMoney(t.monto)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Gastos</p>
                <p className="font-medium text-red-700 dark:text-red-400">{formatMoney(t.gastos)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                  Ganancia
                </p>
                <p
                  className={
                    t.ganancia >= 0
                      ? "font-medium text-green-700 dark:text-green-400"
                      : "font-medium text-red-700 dark:text-red-400"
                  }
                >
                  {formatMoney(t.ganancia)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                  % Ganancia / % Gastos
                </p>
                <p className="font-medium text-green-900 dark:text-green-50">
                  {Math.round(t.pctGanancia * 100)}% / {Math.round(t.pctGastos * 100)}%
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                  Gasto prom. / Ha
                </p>
                <p className="font-medium text-green-900 dark:text-green-50">
                  {formatMoney(t.promedioGastoHa)}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <div className="ml-auto flex w-full max-w-xs flex-col gap-1 rounded-lg border border-green-100 bg-green-50/60 p-4 text-sm dark:border-green-900/40 dark:bg-green-950/20">
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">Hectáreas totales</span>
          <span className="text-green-900 dark:text-green-50">{totalInforme.hectareas}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">Monto total</span>
          <span className="text-green-900 dark:text-green-50">{formatMoney(totalInforme.monto)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">Gastos totales</span>
          <span className="text-red-700 dark:text-red-400">{formatMoney(totalInforme.gastos)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-green-200/60 pt-1 font-semibold dark:border-green-800/60">
          <span className="text-green-900 dark:text-green-50">Ganancia</span>
          <span className="text-green-900 dark:text-green-50">{formatMoney(totalInforme.ganancia)}</span>
        </div>
      </div>

      {personalAgrupado.length > 0 && (
        <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Personal por día</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-2 py-2 font-medium">Nombre</th>
                  <th className="px-2 py-2 font-medium">Rol</th>
                  <th className="px-2 py-2 font-medium">Días pagados</th>
                  <th className="px-2 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {personalAgrupado.map((p, i) => (
                  <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-2 py-2 font-medium text-green-900 dark:text-green-50">{p.nombre}</td>
                    <td className="px-2 py-2 text-green-800/80 dark:text-green-200/80">{p.rol}</td>
                    <td className="px-2 py-2 text-green-800/80 dark:text-green-200/80">
                      {p.dias.map((d) => `${formatDateOnly(d.fecha)} (${formatMoney(d.monto)})`).join(", ")}
                    </td>
                    <td className="px-2 py-2 font-medium text-green-900 dark:text-green-50">
                      {formatMoney(p.dias.reduce((s, d) => s + d.monto, 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <DeleteButton
          action={eliminarInformeProyectoAction.bind(null, id)}
          confirmMessage="¿Eliminar este informe? Esta acción no se puede deshacer."
        />
      </div>
    </div>
  );
}
