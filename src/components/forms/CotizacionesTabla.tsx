"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BotonConfirmarCotizacion } from "@/components/forms/BotonConfirmarCotizacion";
import { eliminarCotizacionAction } from "@/lib/actions/cotizaciones";
import { formatMoney, formatDateOnly } from "@/lib/format";

export type CotizacionFila = {
  id: string;
  fecha: string;
  clienteNombre: string;
  total: number;
  estado: "pendiente" | "confirmada";
  ventaId: string | null;
};

type Filtros = {
  texto: string;
  fechaDesde: string;
  fechaHasta: string;
};

const FILTROS_VACIOS: Filtros = { texto: "", fechaDesde: "", fechaHasta: "" };

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

function BadgeEstado({ estado }: { estado: "pendiente" | "confirmada" }) {
  return estado === "confirmada" ? (
    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
      Confirmada
    </span>
  ) : (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      Pendiente
    </span>
  );
}

export function CotizacionesTabla({ cotizaciones }: { cotizaciones: CotizacionFila[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtradas = useMemo(() => {
    return cotizaciones.filter((c) => {
      const texto = filtros.texto.trim().toLowerCase();
      if (texto && !c.clienteNombre.toLowerCase().includes(texto)) return false;
      if (filtros.fechaDesde && c.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && c.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [cotizaciones, filtros]);

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
          {filtradas.length} de {cotizaciones.length} cotizaciones
        </span>
      </div>

      {/* Vista de escritorio */}
      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Estado</th>
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
                <th className="px-3 py-2" colSpan={3}></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70"
                  >
                    {cotizaciones.length === 0
                      ? "Todavía no hay cotizaciones registradas."
                      : "Ninguna cotización coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtradas.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatDateOnly(c.fecha)}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {c.clienteNombre}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-700 dark:text-green-400">
                      {formatMoney(c.total)}
                    </td>
                    <td className="px-3 py-3">
                      <BadgeEstado estado={c.estado} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/ventas/cotizaciones/${c.id}`}
                          className="text-sm text-green-700 hover:underline dark:text-green-300"
                        >
                          Ver
                        </Link>
                        {c.estado === "pendiente" && (
                          <>
                            <BotonConfirmarCotizacion id={c.id} />
                            <DeleteButton
                              action={eliminarCotizacionAction.bind(null, c.id)}
                              confirmMessage="¿Eliminar esta cotización? Esta acción no se puede deshacer."
                            />
                          </>
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

      {/* Vista de movil: una tarjeta por cotizacion */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtradas.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {cotizaciones.length === 0
              ? "Todavía no hay cotizaciones registradas."
              : "Ninguna cotización coincide con los filtros."}
          </div>
        ) : (
          filtradas.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">
                    {formatDateOnly(c.fecha)}
                  </p>
                  <p className="font-medium text-green-900 dark:text-green-50">{c.clienteNombre}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <BadgeEstado estado={c.estado} />
                  <p className="font-medium text-green-700 dark:text-green-400">
                    {formatMoney(c.total)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                <Link
                  href={`/ventas/cotizaciones/${c.id}`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Ver
                </Link>
                {c.estado === "pendiente" && (
                  <>
                    <BotonConfirmarCotizacion id={c.id} />
                    <DeleteButton
                      action={eliminarCotizacionAction.bind(null, c.id)}
                      confirmMessage="¿Eliminar esta cotización? Esta acción no se puede deshacer."
                    />
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
