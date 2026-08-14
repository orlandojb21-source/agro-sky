"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarRegistroVueloAction } from "@/lib/actions/dronesVuelos";
import { formatDateOnly } from "@/lib/format";

export type RegistroFila = {
  id: string;
  fecha: string;
  droneNombre: string;
  operador: string;
  areaCubierta: number;
  areaDelta: number;
  horasVuelo: number;
  horasDelta: number;
  vuelos: number;
  vuelosDelta: number;
};

function formatDelta(d: number): string {
  return d >= 0 ? `+${d}` : String(d);
}

type Filtros = {
  drone: string;
  operador: string;
  texto: string;
  fechaDesde: string;
  fechaHasta: string;
};

const FILTROS_VACIOS: Filtros = { drone: "", operador: "", texto: "", fechaDesde: "", fechaHasta: "" };

function coincide(valor: string, filtro: string) {
  if (!filtro.trim()) return true;
  return valor.toLowerCase().includes(filtro.trim().toLowerCase());
}

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

export function VuelosTabla({
  registros,
  puedeEditarEliminar,
}: {
  registros: RegistroFila[];
  puedeEditarEliminar: boolean;
}) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      if (!coincide(r.droneNombre, filtros.drone)) return false;
      if (!coincide(r.operador, filtros.operador)) return false;
      if (filtros.texto.trim() && !coincide(`${r.droneNombre} ${r.operador}`, filtros.texto)) return false;
      if (filtros.fechaDesde && r.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && r.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [registros, filtros]);

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "");

  return (
    <div className="flex flex-col gap-4">
      <span className="text-xs text-green-700/60 dark:text-green-300/60">
        {filtrados.length} de {registros.length} registros
      </span>

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-4 pt-2 font-medium">Fecha</th>
                <th className="px-4 pt-2 font-medium">Drone</th>
                <th className="px-4 pt-2 font-medium">Operador</th>
                <th className="px-4 pt-2 font-medium">Área Cubierta</th>
                <th className="px-4 pt-2 font-medium">Horas de Vuelo</th>
                <th className="px-4 pt-2 font-medium">Vuelos</th>
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
                    value={filtros.drone}
                    onChange={(e) => setFiltro("drone", e.target.value)}
                    placeholder="Filtrar..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-4 pb-2">
                  <input
                    type="text"
                    value={filtros.operador}
                    onChange={(e) => setFiltro("operador", e.target.value)}
                    placeholder="Filtrar..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-4 pb-2"></th>
                <th className="px-4 pb-2"></th>
                <th className="px-4 pb-2"></th>
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
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    {registros.length === 0
                      ? "Todavía no hay registros de vuelo."
                      : "Ningún registro coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{formatDateOnly(r.fecha)}</td>
                    <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">{r.droneNombre}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{r.operador}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {r.areaCubierta} ha ({formatDelta(r.areaDelta)})
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {r.horasVuelo} ({formatDelta(r.horasDelta)})
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {r.vuelos} ({formatDelta(r.vuelosDelta)})
                    </td>
                    <td className="px-4 py-3">
                      {puedeEditarEliminar && (
                        <div className="flex gap-3">
                          <Link
                            href={`/bitacora/vuelos/${r.id}/editar`}
                            className="text-sm text-green-700 hover:underline dark:text-green-300"
                          >
                            Editar
                          </Link>
                          <DeleteButton
                            action={eliminarRegistroVueloAction.bind(null, r.id)}
                            confirmMessage="¿Eliminar este registro de vuelo? Se recalculan las diferencias de los registros posteriores de ese drone. Esta acción no se puede deshacer."
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
            placeholder="Buscar drone u operador..."
            className={`w-full ${inputFiltro}`}
          />
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
            {registros.length === 0
              ? "Todavía no hay registros de vuelo."
              : "Ningún registro coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <p className="text-xs text-green-700/60 dark:text-green-300/60">{formatDateOnly(r.fecha)}</p>
              <p className="font-medium text-green-900 dark:text-green-50">{r.droneNombre}</p>
              <p className="text-xs text-green-700/60 dark:text-green-300/60">{r.operador}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-green-800/80 dark:text-green-200/80">
                <span>{r.areaCubierta} ha ({formatDelta(r.areaDelta)})</span>
                <span>{r.horasVuelo} h ({formatDelta(r.horasDelta)})</span>
                <span>{r.vuelos} vuelos ({formatDelta(r.vuelosDelta)})</span>
              </div>
              {puedeEditarEliminar && (
                <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                  <Link
                    href={`/bitacora/vuelos/${r.id}/editar`}
                    className="text-sm text-green-700 hover:underline dark:text-green-300"
                  >
                    Editar
                  </Link>
                  <DeleteButton
                    action={eliminarRegistroVueloAction.bind(null, r.id)}
                    confirmMessage="¿Eliminar este registro de vuelo? Se recalculan las diferencias de los registros posteriores de ese drone. Esta acción no se puede deshacer."
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
