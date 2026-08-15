import { notFound } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BotonExportarInforme } from "@/components/forms/BotonExportarInforme";
import { eliminarInformeProyectoAction } from "@/lib/actions/proyectos";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { CATEGORIAS_GASTO_OPERATIVO, textoEquipoDeCampo } from "@/lib/proyectoGastos";
import type { InformeProyectoExportable } from "@/lib/exportar";

type ItemGastoFila = { id: string; categoria: string; cantidad: number; precio: number; total: number };
type BloqueGastoFila = {
  id: string;
  operador: string | null;
  ayudantes: string[] | null;
  proyecto_gastos_operativos_items: { id: string; categoria: string; cantidad: number; precio: number; total: number }[] | null;
};

export default async function DetalleInformeProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await requirePerfil();
  const puedeEscribir = canWrite(perfil.rol, "informes");

  const supabase = await createClient();
  const [{ data: informe }, { data: filasData }, { data: gastosData }, { data: planillaDetalleData }] =
    await Promise.all([
      supabase
        .from("proyecto_informes")
        .select("id, proyecto, ubicacion, hectareas, precio, total, fecha")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("proyecto_filas")
        .select("id, drone, hectareas, precio, total")
        .eq("informe_id", id)
        .order("id"),
      supabase
        .from("proyecto_gastos_operativos")
        .select(
          "id, operador, ayudantes, proyecto_gastos_operativos_items ( id, categoria, cantidad, precio, total )",
        )
        .eq("informe_id", id)
        .order("id"),
      supabase
        .from("proyecto_planilla_detalle")
        .select("id, colaborador, fecha, monto")
        .eq("informe_id", id)
        .order("fecha"),
    ]);

  if (!informe) notFound();

  const filas = (filasData ?? []).map((f) => ({
    id: f.id as string,
    drone: f.drone as string,
    hectareas: Number(f.hectareas),
    precio: Number(f.precio),
    total: Number(f.total),
  }));

  const totalFilas = filas.reduce((s, f) => s + f.total, 0);
  const hectareasFilas = filas.reduce((s, f) => s + f.hectareas, 0);

  // Cada bloque siempre trae sus 7 categorías (garantizado por
  // crear_informe_proyecto/editar_informe_proyecto), pero se ordenan aquí
  // en el orden fijo de CATEGORIAS_GASTO_OPERATIVO en vez de confiar en el
  // orden de inserción.
  const gastosOperativos = ((gastosData ?? []) as unknown as BloqueGastoFila[]).map((b) => {
    const itemsPorCategoria = new Map(
      (b.proyecto_gastos_operativos_items ?? []).map((it) => [it.categoria, it]),
    );
    const items: ItemGastoFila[] = CATEGORIAS_GASTO_OPERATIVO.map((c) => {
      const encontrado = itemsPorCategoria.get(c.valor);
      return {
        id: encontrado?.id ?? c.valor,
        categoria: c.valor,
        cantidad: Number(encontrado?.cantidad ?? 0),
        precio: Number(encontrado?.precio ?? 0),
        total: Number(encontrado?.total ?? 0),
      };
    });
    return {
      id: b.id,
      operador: b.operador,
      ayudantes: b.ayudantes ?? [],
      items,
      total: items.reduce((s, it) => s + it.total, 0),
    };
  });

  // Un grupo por trabajador (Operador o Ayudante), con cada Informe de
  // Campo en que participó y lo que le corresponde ese día -- ver
  // calcularDetallePlanilla en lib/actions/proyectos.ts (mismo cálculo que
  // llenó esta tabla al guardar el informe).
  const detallePorTrabajador = new Map<string, { fecha: string; monto: number }[]>();
  for (const fila of planillaDetalleData ?? []) {
    const dias = detallePorTrabajador.get(fila.colaborador as string) ?? [];
    dias.push({ fecha: fila.fecha as string, monto: Number(fila.monto) });
    detallePorTrabajador.set(fila.colaborador as string, dias);
  }
  const detallePlanilla = Array.from(detallePorTrabajador.entries())
    .map(([colaborador, dias]) => ({
      colaborador,
      dias,
      total: dias.reduce((s, d) => s + d.monto, 0),
    }))
    .sort((a, b) => a.colaborador.localeCompare(b.colaborador));

  const informeExportable: InformeProyectoExportable = {
    proyecto: informe.proyecto as string,
    ubicacion: informe.ubicacion as string | null,
    hectareas: informe.hectareas === null ? null : Number(informe.hectareas),
    precio: informe.precio === null ? null : Number(informe.precio),
    total: informe.total === null ? null : Number(informe.total),
    fecha: informe.fecha as string,
    filas: filas.map((f) => ({ drone: f.drone, hectareas: f.hectareas, precio: f.precio, total: f.total })),
    gastosOperativos: gastosOperativos.map((b) => ({
      operador: b.operador,
      ayudantes: b.ayudantes,
      items: b.items.map((it) => ({
        categoria: it.categoria,
        etiqueta: CATEGORIAS_GASTO_OPERATIVO.find((c) => c.valor === it.categoria)!.etiqueta,
        cantidad: it.cantidad,
        precio: it.precio,
        total: it.total,
      })),
    })),
    detallePlanilla,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
            {informe.proyecto as string}
          </h1>
          <p className="mt-1 text-sm text-green-700/70 dark:text-green-200/70">
            {informe.ubicacion ? `${informe.ubicacion as string} — ` : ""}
            {formatDateOnly(informe.fecha as string)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonExportarInforme informe={informeExportable} />
          {puedeEscribir && (
            <LinkButton href={`/informes/proyecto/${id}/editar`} variant="secondary">
              Editar
            </LinkButton>
          )}
          <LinkButton href="/informes/proyecto" variant="secondary">
            Volver
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-3 dark:border-green-900/40 dark:bg-green-950/10">
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Hectáreas
          </p>
          <p className="text-green-900 dark:text-green-50">
            {informe.hectareas !== null ? Number(informe.hectareas) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Precio</p>
          <p className="text-green-900 dark:text-green-50">
            {informe.precio !== null ? formatMoney(Number(informe.precio)) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Total</p>
          <p className="text-lg font-semibold text-green-900 dark:text-green-50">
            {informe.total !== null ? formatMoney(Number(informe.total)) : "—"}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Drone</th>
                <th className="px-3 py-2 font-medium">HA</th>
                <th className="px-3 py-2 font-medium">Precio</th>
                <th className="px-3 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    Este informe no tiene filas.
                  </td>
                </tr>
              ) : (
                filas.map((f) => (
                  <tr key={f.id} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-3 py-3 text-green-900 dark:text-green-50">{f.drone}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{f.hectareas}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(f.precio)}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {formatMoney(f.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                  <td className="px-3 py-2 text-green-900 dark:text-green-50">total</td>
                  <td className="px-3 py-2 text-green-900 dark:text-green-50">{hectareasFilas}</td>
                  <td></td>
                  <td className="px-3 py-2 text-green-700 dark:text-green-400">{formatMoney(totalFilas)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {gastosOperativos.map((bloque) => (
        <div
          key={bloque.id}
          className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
        >
          <h2 className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
            Gastos operativos — {textoEquipoDeCampo(bloque.operador, bloque.ayudantes) || "Equipo sin nombre"}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-3 py-2 font-medium">Categoría</th>
                  <th className="px-3 py-2 font-medium">Cantidad</th>
                  <th className="px-3 py-2 font-medium">Precio unitario</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {bloque.items.map((it) => (
                  <tr key={it.id} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-3 py-3 text-green-900 dark:text-green-50">
                      {CATEGORIAS_GASTO_OPERATIVO.find((c) => c.valor === it.categoria)!.etiqueta}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{it.cantidad}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(it.precio)}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {formatMoney(it.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                  <td className="px-3 py-2 text-green-900 dark:text-green-50" colSpan={3}>
                    total
                  </td>
                  <td className="px-3 py-2 text-green-700 dark:text-green-400">{formatMoney(bloque.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}

      {detallePlanilla.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Detalle de pago de Planilla</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detallePlanilla.map((trabajador) => (
              <div
                key={trabajador.colaborador}
                className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
              >
                <h3 className="border-b border-green-100 bg-green-50 px-4 py-2 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
                  {trabajador.colaborador}
                </h3>
                <table className="w-full text-left text-sm">
                  <tbody>
                    {trabajador.dias.map((dia, i) => (
                      <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                        <td className="px-4 py-2 text-green-800/80 dark:text-green-200/80">
                          {formatDateOnly(dia.fecha)}
                        </td>
                        <td className="px-4 py-2 text-right text-green-900 dark:text-green-50">
                          {formatMoney(dia.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                      <td className="px-4 py-2 text-green-900 dark:text-green-50">total</td>
                      <td className="px-4 py-2 text-right text-green-700 dark:text-green-400">
                        {formatMoney(trabajador.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {puedeEscribir && (
        <div>
          <DeleteButton
            action={eliminarInformeProyectoAction.bind(null, id)}
            confirmMessage="¿Eliminar este informe? Esta acción no se puede deshacer."
          />
        </div>
      )}
    </div>
  );
}
