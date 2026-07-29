import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BotonExportarInforme } from "@/components/forms/BotonExportarInforme";
import { eliminarInformeProyectoAction } from "@/lib/actions/proyectos";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { CATEGORIAS_GASTO_OPERATIVO } from "@/lib/proyectoGastos";
import type { InformeProyectoExportable } from "@/lib/exportar";

type ItemGastoFila = { id: string; categoria: string; cantidad: number; precio: number; total: number };
type BloqueGastoFila = {
  id: string;
  drone: string;
  proyecto_gastos_operativos_items: { id: string; categoria: string; cantidad: number; precio: number; total: number }[] | null;
};

export default async function DetalleInformeProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("proyectos");

  const supabase = await createClient();
  const [{ data: informe }, { data: filasData }, { data: gastosData }] = await Promise.all([
    supabase
      .from("proyecto_informes")
      .select("id, proyecto, ubicacion, hectareas, precio, total, fecha_desde, fecha_hasta")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("proyecto_filas")
      .select("id, drone, hectareas, precio, total")
      .eq("informe_id", id)
      .order("id"),
    supabase
      .from("proyecto_gastos_operativos")
      .select("id, drone, proyecto_gastos_operativos_items ( id, categoria, cantidad, precio, total )")
      .eq("informe_id", id)
      .order("id"),
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
    return { id: b.id, drone: b.drone, items, total: items.reduce((s, it) => s + it.total, 0) };
  });

  const informeExportable: InformeProyectoExportable = {
    proyecto: informe.proyecto as string,
    ubicacion: informe.ubicacion as string | null,
    hectareas: informe.hectareas === null ? null : Number(informe.hectareas),
    precio: informe.precio === null ? null : Number(informe.precio),
    total: informe.total === null ? null : Number(informe.total),
    fechaDesde: informe.fecha_desde as string,
    fechaHasta: informe.fecha_hasta as string,
    filas: filas.map((f) => ({ drone: f.drone, hectareas: f.hectareas, precio: f.precio, total: f.total })),
    gastosOperativos: gastosOperativos.map((b) => ({
      drone: b.drone,
      items: b.items.map((it) => ({
        categoria: it.categoria,
        etiqueta: CATEGORIAS_GASTO_OPERATIVO.find((c) => c.valor === it.categoria)!.etiqueta,
        cantidad: it.cantidad,
        precio: it.precio,
        total: it.total,
      })),
    })),
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
            {formatDateOnly(informe.fecha_desde as string)} al {formatDateOnly(informe.fecha_hasta as string)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonExportarInforme informe={informeExportable} />
          <LinkButton href={`/proyectos/${id}/editar`} variant="secondary">
            Editar
          </LinkButton>
          <LinkButton href="/proyectos" variant="secondary">
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
            Gastos operativos — {bloque.drone}
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

      <div>
        <DeleteButton
          action={eliminarInformeProyectoAction.bind(null, id)}
          confirmMessage="¿Eliminar este informe? Esta acción no se puede deshacer."
        />
      </div>
    </div>
  );
}
