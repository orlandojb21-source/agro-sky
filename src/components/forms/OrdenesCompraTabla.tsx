"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarOrdenAction } from "@/lib/actions/compras";
import { formatDateOnly } from "@/lib/format";

export type OrdenFila = {
  id: string;
  numeroOrden: number;
  fecha: string;
  proveedorNombre: string;
  cantidadItems: number;
  estado: "pendiente_recepcion" | "recibida";
};

type Filtros = {
  texto: string;
  fechaDesde: string;
  fechaHasta: string;
};

const FILTROS_VACIOS: Filtros = { texto: "", fechaDesde: "", fechaHasta: "" };

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

function BadgeEstado({ estado }: { estado: OrdenFila["estado"] }) {
  return estado === "recibida" ? (
    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
      Recibida
    </span>
  ) : (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      Pendiente de recepción
    </span>
  );
}

export function OrdenesCompraTabla({ ordenes }: { ordenes: OrdenFila[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtradas = useMemo(() => {
    return ordenes.filter((o) => {
      const texto = filtros.texto.trim().toLowerCase();
      if (texto && !o.proveedorNombre.toLowerCase().includes(texto)) return false;
      if (filtros.fechaDesde && o.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && o.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [ordenes, filtros]);

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
          {filtradas.length} de {ordenes.length} órdenes
        </span>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">No.</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Proveedor</th>
                <th className="px-3 py-2 font-medium">Productos</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
              <tr className="border-b border-green-100 bg-green-50/60 dark:border-green-900/40 dark:bg-green-950/20">
                <th className="px-3 py-2"></th>
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
                    placeholder="Buscar proveedor..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-3 py-2" colSpan={3}></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70"
                  >
                    {ordenes.length === 0
                      ? "Todavía no hay órdenes de compra registradas."
                      : "Ninguna orden coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtradas.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {String(o.numeroOrden).padStart(4, "0")}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatDateOnly(o.fecha)}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {o.proveedorNombre}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {o.cantidadItems}
                    </td>
                    <td className="px-3 py-3">
                      <BadgeEstado estado={o.estado} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/compras/ordenes/${o.id}`}
                          className="text-sm text-green-700 hover:underline dark:text-green-300"
                        >
                          Ver
                        </Link>
                        {o.estado === "pendiente_recepcion" && (
                          <DeleteButton
                            action={eliminarOrdenAction.bind(null, o.id)}
                            confirmMessage="¿Eliminar esta orden de compra? Esta acción no se puede deshacer."
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {filtradas.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {ordenes.length === 0
              ? "Todavía no hay órdenes de compra registradas."
              : "Ninguna orden coincide con los filtros."}
          </div>
        ) : (
          filtradas.map((o) => (
            <div
              key={o.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">
                    {formatDateOnly(o.fecha)}
                  </p>
                  <p className="font-medium text-green-900 dark:text-green-50">
                    Orden No. {String(o.numeroOrden).padStart(4, "0")}
                  </p>
                  <p className="text-sm text-green-800/80 dark:text-green-200/80">
                    {o.proveedorNombre}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <BadgeEstado estado={o.estado} />
                  <p className="text-xs text-green-700/70 dark:text-green-300/70">
                    {o.cantidadItems} producto(s)
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                <Link
                  href={`/compras/ordenes/${o.id}`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Ver
                </Link>
                {o.estado === "pendiente_recepcion" && (
                  <DeleteButton
                    action={eliminarOrdenAction.bind(null, o.id)}
                    confirmMessage="¿Eliminar esta orden de compra? Esta acción no se puede deshacer."
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
