"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarGastoAction } from "@/lib/actions/gastos";
import { CATEGORIA_GASTO_LABEL } from "@/lib/validation/gastos";
import { formatDateOnly, formatMoney } from "@/lib/format";

export type GastoFila = {
  id: string;
  fecha: string;
  proveedorNombre: string | null;
  proyectoCodigo: string | null;
  categoria: string;
  categoriaOtro: string | null;
  numeroFactura: string | null;
  monto: number;
  estadoPago: "pagada" | "por_pagar";
  fechaTopePago: string | null;
};

function etiquetaCategoria(g: GastoFila) {
  return g.categoria === "otro" ? (g.categoriaOtro ?? "Otro") : (CATEGORIA_GASTO_LABEL[g.categoria] ?? g.categoria);
}

function BadgeEstado({ estado, fechaTopePago }: { estado: "pagada" | "por_pagar"; fechaTopePago: string | null }) {
  if (estado === "pagada") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
        Pagada
      </span>
    );
  }
  return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
      Por pagar{fechaTopePago ? ` — tope ${formatDateOnly(fechaTopePago)}` : ""}
    </span>
  );
}

type Filtros = {
  categoria: string;
  proveedor: string;
  proyecto: string;
  factura: string;
  texto: string;
  estado: "" | "pagada" | "por_pagar";
  fechaDesde: string;
  fechaHasta: string;
};

const FILTROS_VACIOS: Filtros = {
  categoria: "",
  proveedor: "",
  proyecto: "",
  factura: "",
  texto: "",
  estado: "",
  fechaDesde: "",
  fechaHasta: "",
};

function coincide(valor: string | null | undefined, filtro: string) {
  if (!filtro.trim()) return true;
  return (valor ?? "").toLowerCase().includes(filtro.trim().toLowerCase());
}

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

export function GastosTabla({
  gastos,
  puedeEscribir,
}: {
  gastos: GastoFila[];
  puedeEscribir: boolean;
}) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    return gastos.filter((g) => {
      if (!coincide(etiquetaCategoria(g), filtros.categoria)) return false;
      if (!coincide(g.proveedorNombre, filtros.proveedor)) return false;
      if (!coincide(g.proyectoCodigo, filtros.proyecto)) return false;
      if (!coincide(g.numeroFactura, filtros.factura)) return false;
      if (filtros.texto.trim()) {
        const campos = [etiquetaCategoria(g), g.proveedorNombre, g.proyectoCodigo, g.numeroFactura]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!campos.includes(filtros.texto.trim().toLowerCase())) return false;
      }
      if (filtros.estado && g.estadoPago !== filtros.estado) return false;
      if (filtros.fechaDesde && g.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && g.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [gastos, filtros]);

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "");
  const totalFiltrado = filtrados.reduce((s, g) => s + g.monto, 0);

  return (
    <div className="flex flex-col gap-4">
      {filtrados.length > 0 && (
        <p className="text-sm text-green-800 dark:text-green-200">
          Total {hayFiltrosActivos ? "filtrado" : "registrado"}:{" "}
          <span className="font-semibold">{formatMoney(totalFiltrado)}</span>
          <span className="ml-2 text-xs text-green-700/60 dark:text-green-300/60">
            ({filtrados.length} de {gastos.length})
          </span>
        </p>
      )}

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-4 pt-2 font-medium">Fecha</th>
                <th className="px-4 pt-2 font-medium">Categoría</th>
                <th className="px-4 pt-2 font-medium">Proveedor</th>
                <th className="px-4 pt-2 font-medium">Proyecto</th>
                <th className="px-4 pt-2 font-medium">N.° Factura</th>
                <th className="px-4 pt-2 font-medium">Monto</th>
                <th className="px-4 pt-2 font-medium">Estado</th>
                <th className="px-4 pt-2"></th>
              </tr>
              <tr className="border-b border-green-100 bg-green-50 dark:border-green-900/40 dark:bg-green-950/30">
                <th className="px-4 pb-2">
                  <div className="flex flex-col gap-1">
                    <input
                      type="date"
                      value={filtros.fechaDesde}
                      onChange={(e) => setFiltro("fechaDesde", e.target.value)}
                      className={inputFiltro}
                      aria-label="Desde"
                    />
                    <input
                      type="date"
                      value={filtros.fechaHasta}
                      onChange={(e) => setFiltro("fechaHasta", e.target.value)}
                      className={inputFiltro}
                      aria-label="Hasta"
                    />
                  </div>
                </th>
                <th className="px-4 pb-2">
                  <input
                    type="text"
                    value={filtros.categoria}
                    onChange={(e) => setFiltro("categoria", e.target.value)}
                    placeholder="Filtrar..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-4 pb-2">
                  <input
                    type="text"
                    value={filtros.proveedor}
                    onChange={(e) => setFiltro("proveedor", e.target.value)}
                    placeholder="Filtrar..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-4 pb-2">
                  <input
                    type="text"
                    value={filtros.proyecto}
                    onChange={(e) => setFiltro("proyecto", e.target.value)}
                    placeholder="Filtrar..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-4 pb-2">
                  <input
                    type="text"
                    value={filtros.factura}
                    onChange={(e) => setFiltro("factura", e.target.value)}
                    placeholder="Filtrar..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-4 pb-2"></th>
                <th className="px-4 pb-2">
                  <select
                    value={filtros.estado}
                    onChange={(e) => setFiltro("estado", e.target.value as Filtros["estado"])}
                    className={inputFiltro}
                  >
                    <option value="">Todos</option>
                    <option value="pagada">Pagada</option>
                    <option value="por_pagar">Por pagar</option>
                  </select>
                </th>
                <th className="px-4 pb-2">
                  {hayFiltrosActivos && (
                    <button
                      onClick={() => setFiltros(FILTROS_VACIOS)}
                      className="whitespace-nowrap text-xs font-normal normal-case text-green-700 hover:underline dark:text-green-300"
                    >
                      Limpiar
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    {gastos.length === 0 ? "Todavía no hay gastos registrados." : "Ningún gasto coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{formatDateOnly(g.fecha)}</td>
                    <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">{etiquetaCategoria(g)}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{g.proveedorNombre ?? "—"}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{g.proyectoCodigo ?? "—"}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{g.numeroFactura ?? "—"}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{formatMoney(g.monto)}</td>
                    <td className="px-4 py-3">
                      <BadgeEstado estado={g.estadoPago} fechaTopePago={g.fechaTopePago} />
                    </td>
                    <td className="px-4 py-3">
                      {puedeEscribir && (
                        <div className="flex gap-3">
                          <Link
                            href={`/gastos-operativos/gastos/${g.id}/editar`}
                            className="text-sm text-green-700 hover:underline dark:text-green-300"
                          >
                            Editar
                          </Link>
                          <DeleteButton
                            action={eliminarGastoAction.bind(null, g.id)}
                            confirmMessage="¿Eliminar este gasto? Esta acción no se puede deshacer."
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-green-100 bg-white p-3 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <input
            type="text"
            value={filtros.texto}
            onChange={(e) => setFiltro("texto", e.target.value)}
            placeholder="Buscar categoría, proveedor, proyecto o factura..."
            className={`w-full ${inputFiltro}`}
          />
          <select
            value={filtros.estado}
            onChange={(e) => setFiltro("estado", e.target.value as Filtros["estado"])}
            className={inputFiltro}
          >
            <option value="">Todos los estados</option>
            <option value="pagada">Pagada</option>
            <option value="por_pagar">Por pagar</option>
          </select>
          <input
            type="date"
            value={filtros.fechaDesde}
            onChange={(e) => setFiltro("fechaDesde", e.target.value)}
            className={inputFiltro}
          />
          <input
            type="date"
            value={filtros.fechaHasta}
            onChange={(e) => setFiltro("fechaHasta", e.target.value)}
            className={inputFiltro}
          />
          {hayFiltrosActivos && (
            <button
              onClick={() => setFiltros(FILTROS_VACIOS)}
              className="text-sm text-green-700 hover:underline dark:text-green-300"
            >
              Limpiar filtros
            </button>
          )}
        </div>
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {gastos.length === 0 ? "Todavía no hay gastos registrados." : "Ningún gasto coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">{formatDateOnly(g.fecha)}</p>
                  <p className="font-medium text-green-900 dark:text-green-50">{etiquetaCategoria(g)}</p>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">
                    {g.proveedorNombre ?? "Sin proveedor"} {g.proyectoCodigo ? `· ${g.proyectoCodigo}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-green-700 dark:text-green-400">
                  {formatMoney(g.monto)}
                </p>
              </div>
              <div className="mt-2">
                <BadgeEstado estado={g.estadoPago} fechaTopePago={g.fechaTopePago} />
              </div>
              {puedeEscribir && (
                <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                  <Link
                    href={`/gastos-operativos/gastos/${g.id}/editar`}
                    className="text-sm text-green-700 hover:underline dark:text-green-300"
                  >
                    Editar
                  </Link>
                  <DeleteButton
                    action={eliminarGastoAction.bind(null, g.id)}
                    confirmMessage="¿Eliminar este gasto? Esta acción no se puede deshacer."
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
