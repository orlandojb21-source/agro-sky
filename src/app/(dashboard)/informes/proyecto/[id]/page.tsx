import { notFound } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BotonExportarInforme } from "@/components/forms/BotonExportarInforme";
import { eliminarInformeProyectoAction } from "@/lib/actions/proyectos";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { CATEGORIAS_GASTO_OPERATIVO, textoEquipoDeCampo, mapearGastosProyecto } from "@/lib/proyectoGastos";
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
        .select("id, proyecto_id, proyecto, ubicacion, hectareas, precio, total, fecha")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("proyecto_filas")
        .select("id, drone, hectareas, precio, total, informes_campo ( operador )")
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

  // En vivo, no una copia guardada al crear el análisis (ver
  // mapearGastosProyecto) -- gastos de Caja Menuda/Compras que ya traían
  // este Proyecto asociado.
  const [{ data: cajaGastosProyecto }, { data: gastosComprasProyecto }] = await Promise.all([
    supabase
      .from("caja_gastos")
      .select("id, fecha, categoria, monto, concepto")
      .eq("proyecto_id", informe.proyecto_id as string)
      .order("fecha"),
    supabase
      .from("gastos")
      .select("id, fecha, categoria, categoria_otro, monto, descripcion")
      .eq("proyecto_id", informe.proyecto_id as string)
      .order("fecha"),
  ]);
  // Viáticos ya se ve arriba, en el bloque de Gastos Operativos por equipo
  // -- se deja fuera de esta lista general para no mostrarlo (ni sumarlo
  // al Total Gastos Operativos) dos veces.
  const gastosProyecto = mapearGastosProyecto(
    (cajaGastosProyecto ?? []).filter((g) => g.categoria !== "Viáticos") as {
      id: string;
      fecha: string;
      categoria: string | null;
      monto: number;
      concepto: string | null;
    }[],
    (gastosComprasProyecto ?? []) as {
      id: string;
      fecha: string;
      categoria: string;
      categoria_otro: string | null;
      monto: number;
      descripcion: string | null;
    }[],
  );
  const totalGastosProyectoRegistrados = gastosProyecto.reduce((s, g) => s + g.monto, 0);

  const filas = (filasData ?? []).map((f) => ({
    id: f.id as string,
    operador: (f.informes_campo as unknown as { operador: string } | null)?.operador ?? "",
    drone: f.drone as string,
    hectareas: Number(f.hectareas),
    precio: Number(f.precio),
    total: Number(f.total),
  }));

  const totalFilas = filas.reduce((s, f) => s + f.total, 0);
  const hectareasFilas = filas.reduce((s, f) => s + f.hectareas, 0);
  const totalGastosOperativos =
    ((gastosData ?? []) as unknown as BloqueGastoFila[]).reduce(
      (s, b) => s + (b.proyecto_gastos_operativos_items ?? []).reduce((si, it) => si + Number(it.total), 0),
      0,
    ) + totalGastosProyectoRegistrados;

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

  // Rendimiento por equipo (pedido del usuario, 2026-08-15): % Ganancias y
  // % Gastos son el margen neto de ESE equipo (no del proyecto completo),
  // calculado solo con lo que ya está en esta misma pantalla -- Ingresos =
  // suma de "Total" de sus filas (primer cuadro, agrupadas por operador),
  // Gastos = el total de su bloque de Gastos Operativos, HA = suma de
  // hectáreas de esas mismas filas. Se compara por operador.trim() porque
  // así se guarda en ambos lados (ver claveEquipo en lib/actions/
  // proyectos.ts).
  const rendimientoPorEquipo = gastosOperativos.map((bloque) => {
    const operadorNorm = bloque.operador?.trim() ?? "";
    const filasEquipo = filas.filter((f) => f.operador.trim() === operadorNorm);
    const ingresos = filasEquipo.reduce((s, f) => s + f.total, 0);
    const hectareas = filasEquipo.reduce((s, f) => s + f.hectareas, 0);
    const gastos = bloque.total;
    const gananciaNeta = ingresos - gastos;
    return {
      id: bloque.id,
      etiquetaEquipo: textoEquipoDeCampo(bloque.operador, bloque.ayudantes) || "Equipo sin nombre",
      gananciaNeta,
      gastos,
      porcentajeGanancias: ingresos > 0 ? (gananciaNeta / ingresos) * 100 : null,
      porcentajeGastos: ingresos > 0 ? (gastos / ingresos) * 100 : null,
      promedioGastosPorHa: hectareas > 0 ? gastos / hectareas : null,
    };
  });

  // Consolidado de todos los equipos (pedido del usuario, 2026-08-16) --
  // mismo margen neto de arriba pero con Ingresos = totalFilas y Gastos =
  // totalGastosOperativos (el mismo "Total Gastos Operativos" ya mostrado
  // en esta pantalla, que sí incluye los gastos de Caja Menuda/Compras
  // registrados al proyecto en general, no solo los de cada equipo).
  const rendimientoTotal = {
    gananciaNeta: totalFilas - totalGastosOperativos,
    gastos: totalGastosOperativos,
    porcentajeGanancias: totalFilas > 0 ? ((totalFilas - totalGastosOperativos) / totalFilas) * 100 : null,
    porcentajeGastos: totalFilas > 0 ? (totalGastosOperativos / totalFilas) * 100 : null,
    promedioGastosPorHa: hectareasFilas > 0 ? totalGastosOperativos / hectareasFilas : null,
  };

  const informeExportable: InformeProyectoExportable = {
    proyecto: informe.proyecto as string,
    ubicacion: informe.ubicacion as string | null,
    hectareas: informe.hectareas === null ? null : Number(informe.hectareas),
    precio: informe.precio === null ? null : Number(informe.precio),
    total: informe.total === null ? null : Number(informe.total),
    fecha: informe.fecha as string,
    filas: filas.map((f) => ({
      operador: f.operador,
      drone: f.drone,
      hectareas: f.hectareas,
      precio: f.precio,
      total: f.total,
    })),
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
    gastosProyecto,
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
                <th className="px-3 py-2 font-medium">Operador</th>
                <th className="px-3 py-2 font-medium">Drone</th>
                <th className="px-3 py-2 font-medium">HA</th>
                <th className="px-3 py-2 font-medium">Precio</th>
                <th className="px-3 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    Este informe no tiene filas.
                  </td>
                </tr>
              ) : (
                filas.map((f) => (
                  <tr key={f.id} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-3 py-3 text-green-900 dark:text-green-50">{f.operador}</td>
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
                  <td></td>
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

      {gastosProyecto.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <h2 className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
            Gastos registrados para este proyecto (Caja Menuda / Compras)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Origen</th>
                  <th className="px-3 py-2 font-medium">Categoría</th>
                  <th className="px-3 py-2 font-medium">Descripción</th>
                  <th className="px-3 py-2 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {gastosProyecto.map((g) => (
                  <tr key={`${g.origen}-${g.id}`} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{formatDateOnly(g.fecha)}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {g.origen === "caja_menuda" ? "Caja Menuda" : "Compras"}
                    </td>
                    <td className="px-3 py-3 text-green-900 dark:text-green-50">{g.categoria}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{g.descripcion || "—"}</td>
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {formatMoney(g.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                  <td className="px-3 py-2 text-green-900 dark:text-green-50" colSpan={4}>
                    total
                  </td>
                  <td className="px-3 py-2 text-green-700 dark:text-green-400">
                    {formatMoney(totalGastosProyectoRegistrados)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {(gastosOperativos.length > 0 || gastosProyecto.length > 0) && (
        <div className="rounded-xl border border-green-100 bg-green-50/60 px-6 py-4 text-right dark:border-green-900/40 dark:bg-green-950/20">
          <span className="text-sm font-medium text-green-900 dark:text-green-50">Total Gastos Operativos: </span>
          <span className="text-lg font-semibold text-green-700 dark:text-green-400">
            {formatMoney(totalGastosOperativos)}
          </span>
        </div>
      )}

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

      {rendimientoPorEquipo.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Rendimiento por equipo</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rendimientoPorEquipo.map((eq) => (
              <div
                key={eq.id}
                className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
              >
                <h3 className="border-b border-green-100 bg-green-50 px-4 py-2 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
                  {eq.etiquetaEquipo}
                </h3>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                      <th className="px-4 py-2 font-medium">Porcentaje de Ganancias</th>
                      <th className="px-4 py-2 font-medium">Porcentaje de Gastos</th>
                      <th className="px-4 py-2 font-medium">Promedio de Gastos por HA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-green-50 dark:border-green-900/30">
                      <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                        {eq.porcentajeGanancias !== null ? `${eq.porcentajeGanancias.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                        {eq.porcentajeGastos !== null ? `${eq.porcentajeGastos.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                        {eq.promedioGastosPorHa !== null ? formatMoney(eq.promedioGastosPorHa) : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                        {formatMoney(eq.gananciaNeta)}
                      </td>
                      <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                        {formatMoney(eq.gastos)}
                      </td>
                      <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <h3 className="border-b border-green-100 bg-green-50 px-4 py-2 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
              Total del Proyecto (todos los equipos)
            </h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-4 py-2 font-medium">Porcentaje de Ganancias</th>
                  <th className="px-4 py-2 font-medium">Porcentaje de Gastos</th>
                  <th className="px-4 py-2 font-medium">Promedio de Gastos por HA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-green-50 dark:border-green-900/30">
                  <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                    {rendimientoTotal.porcentajeGanancias !== null
                      ? `${rendimientoTotal.porcentajeGanancias.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                    {rendimientoTotal.porcentajeGastos !== null
                      ? `${rendimientoTotal.porcentajeGastos.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                    {rendimientoTotal.promedioGastosPorHa !== null
                      ? formatMoney(rendimientoTotal.promedioGastosPorHa)
                      : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatMoney(rendimientoTotal.gananciaNeta)}
                  </td>
                  <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatMoney(rendimientoTotal.gastos)}
                  </td>
                  <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">—</td>
                </tr>
              </tbody>
            </table>
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
