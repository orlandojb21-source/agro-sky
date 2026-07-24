"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarVentaAction } from "@/lib/actions/ventas";
import { formatMoney, formatDateOnly } from "@/lib/format";

export type VentaFila = {
  id: string;
  fecha: string;
  clienteNombre: string;
  subtotalGravado: number;
  subtotalExento: number;
  itbms: number;
  total: number;
};

type Filtros = {
  texto: string;
  fechaDesde: string;
  fechaHasta: string;
};

const FILTROS_VACIOS: Filtros = { texto: "", fechaDesde: "", fechaHasta: "" };

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

export function VentasTabla({ ventas }: { ventas: VentaFila[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtradas = useMemo(() => {
    return ventas.filter((v) => {
      const texto = filtros.texto.trim().toLowerCase();
      if (texto && !v.clienteNombre.toLowerCase().includes(texto)) return false;
      if (filtros.fechaDesde && v.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && v.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [ventas, filtros]);

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {hayFiltrosActivos && (
          <button
            onClick={() => setFiltros(FILTROS_VACIOS)}
            className="text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Limpiar filtros
          </button>
        )}
        <span className="text-xs text-green-700/60 dark:text-green-300/60">
          {filtradas.length} de {ventas.length} ventas
        </span>
      </div>

      {/* Vista de escritorio: tabla con filtros integrados en el encabezado */}
      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Subtotal gravado</th>
                <th className="px-3 py-2 font-medium">Subtotal exento</th>
                <th className="px-3 py-2 font-medium">ITBMS</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
              <tr className="border-b border-green-100 bg-green-50/60 dark:border-green-900/40 dark:bg-green-950/20">
                <th className="px-3 py-2">
                  <div className="flex gap-1">
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
                  </div>
                </th>
                <th className="px-3 py-2">
                  <input
                    type="text"
                    value={filtros.texto}
                    onChange={(e) => setFiltro("texto", e.target.value)}
                    placeholder="Buscar cliente..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-3 py-2" colSpan={4}></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70"
                  >
                    {ventas.length === 0
                      ? "Todavía no hay ventas registradas."
                      : "Ninguna venta coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtradas.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatDateOnly(v.fecha)}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {v.clienteNombre}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(v.subtotalGravado)}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(v.subtotalExento)}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(v.itbms)}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-700 dark:text-green-400">
                      {formatMoney(v.total)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/ventas/${v.id}`}
                          className="text-sm text-green-700 hover:underline dark:text-green-300"
                        >
                          Ver
                        </Link>
                        <DeleteButton
                          action={eliminarVentaAction.bind(null, v.id)}
                          confirmMessage="¿Eliminar esta venta? El stock de los productos Nuevo/Usado vendidos se devuelve al inventario. Esta acción no se puede deshacer."
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista de movil: una tarjeta por venta */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtradas.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {ventas.length === 0
              ? "Todavía no hay ventas registradas."
              : "Ninguna venta coincide con los filtros."}
          </div>
        ) : (
          filtradas.map((v) => (
            <div
              key={v.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">
                    {formatDateOnly(v.fecha)}
                  </p>
                  <p className="font-medium text-green-900 dark:text-green-50">{v.clienteNombre}</p>
                </div>
                <p className="shrink-0 font-medium text-green-700 dark:text-green-400">
                  {formatMoney(v.total)}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Gravado
                  </p>
                  <p className="text-green-900 dark:text-green-50">{formatMoney(v.subtotalGravado)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Exento
                  </p>
                  <p className="text-green-900 dark:text-green-50">{formatMoney(v.subtotalExento)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    ITBMS
                  </p>
                  <p className="text-green-900 dark:text-green-50">{formatMoney(v.itbms)}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                <Link
                  href={`/ventas/${v.id}`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Ver
                </Link>
                <DeleteButton
                  action={eliminarVentaAction.bind(null, v.id)}
                  confirmMessage="¿Eliminar esta venta? El stock de los productos Nuevo/Usado vendidos se devuelve al inventario. Esta acción no se puede deshacer."
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
