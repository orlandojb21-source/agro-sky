"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarInformeProyectoAction } from "@/lib/actions/proyectos";
import { formatMoney, formatDateOnly } from "@/lib/format";

export type InformeProyectoFila = {
  id: string;
  proyecto: string;
  ubicacion: string | null;
  fechaDesde: string;
  fechaHasta: string;
  hectareas: number;
  monto: number;
  gastos: number;
  ganancia: number;
};

type Filtros = {
  texto: string;
  fechaDesde: string;
  fechaHasta: string;
};

const FILTROS_VACIOS: Filtros = { texto: "", fechaDesde: "", fechaHasta: "" };

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

export function ProyectoInformesTabla({ informes }: { informes: InformeProyectoFila[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    return informes.filter((i) => {
      const texto = filtros.texto.trim().toLowerCase();
      if (
        texto &&
        !i.proyecto.toLowerCase().includes(texto) &&
        !(i.ubicacion ?? "").toLowerCase().includes(texto)
      )
        return false;
      if (filtros.fechaDesde && i.fechaHasta < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && i.fechaDesde > filtros.fechaHasta) return false;
      return true;
    });
  }, [informes, filtros]);

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
          {filtrados.length} de {informes.length} informes
        </span>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Semana</th>
                <th className="px-3 py-2 font-medium">Proyecto</th>
                <th className="px-3 py-2 font-medium">Ubicación</th>
                <th className="px-3 py-2 font-medium">Hectáreas</th>
                <th className="px-3 py-2 font-medium">Monto</th>
                <th className="px-3 py-2 font-medium">Gastos</th>
                <th className="px-3 py-2 font-medium">Ganancia</th>
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
                <th className="px-3 py-2" colSpan={2}>
                  <input
                    type="text"
                    value={filtros.texto}
                    onChange={(e) => setFiltro("texto", e.target.value)}
                    placeholder="Buscar proyecto o ubicación..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-3 py-2" colSpan={4}></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70"
                  >
                    {informes.length === 0
                      ? "Todavía no hay informes registrados."
                      : "Ningún informe coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatDateOnly(i.fechaDesde)} – {formatDateOnly(i.fechaHasta)}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {i.proyecto}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {i.ubicacion ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{i.hectareas}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(i.monto)}
                    </td>
                    <td className="px-3 py-3 text-red-700 dark:text-red-400">{formatMoney(i.gastos)}</td>
                    <td
                      className={
                        i.ganancia >= 0
                          ? "px-3 py-3 font-medium text-green-700 dark:text-green-400"
                          : "px-3 py-3 font-medium text-red-700 dark:text-red-400"
                      }
                    >
                      {formatMoney(i.ganancia)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/proyectos/${i.id}`}
                          className="text-sm text-green-700 hover:underline dark:text-green-300"
                        >
                          Ver
                        </Link>
                        <DeleteButton
                          action={eliminarInformeProyectoAction.bind(null, i.id)}
                          confirmMessage="¿Eliminar este informe? Esta acción no se puede deshacer."
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

      <div className="flex flex-col gap-3 sm:hidden">
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {informes.length === 0
              ? "Todavía no hay informes registrados."
              : "Ningún informe coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((i) => (
            <div
              key={i.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">
                    {formatDateOnly(i.fechaDesde)} – {formatDateOnly(i.fechaHasta)}
                  </p>
                  <p className="font-medium text-green-900 dark:text-green-50">{i.proyecto}</p>
                  {i.ubicacion && (
                    <p className="text-xs text-green-700/60 dark:text-green-300/60">{i.ubicacion}</p>
                  )}
                </div>
                <p
                  className={
                    i.ganancia >= 0
                      ? "shrink-0 font-medium text-green-700 dark:text-green-400"
                      : "shrink-0 font-medium text-red-700 dark:text-red-400"
                  }
                >
                  {formatMoney(i.ganancia)}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Ha
                  </p>
                  <p className="text-green-900 dark:text-green-50">{i.hectareas}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Monto
                  </p>
                  <p className="text-green-900 dark:text-green-50">{formatMoney(i.monto)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Gastos
                  </p>
                  <p className="text-green-900 dark:text-green-50">{formatMoney(i.gastos)}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                <Link
                  href={`/proyectos/${i.id}`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Ver
                </Link>
                <DeleteButton
                  action={eliminarInformeProyectoAction.bind(null, i.id)}
                  confirmMessage="¿Eliminar este informe? Esta acción no se puede deshacer."
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
