"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EstadoDroneBadge } from "@/components/ui/EstadoDroneBadge";
import { ESTADO_DRONE, ESTADO_DRONE_LABEL, type EstadoDrone } from "@/lib/validation/drones";

export type DroneFila = {
  id: string;
  nombre: string;
  modelo: string;
  operadorActual: string | null;
  areaCubierta: number;
  horasVuelo: number;
  vuelos: number;
  estado: EstadoDrone;
  estadoDetalle: string | null;
};

type Filtros = {
  texto: string;
  estado: "" | EstadoDrone;
};

const FILTROS_VACIOS: Filtros = { texto: "", estado: "" };

const inputFiltro =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function DronesTabla({ drones }: { drones: DroneFila[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    const texto = filtros.texto.trim().toLowerCase();
    return drones.filter((d) => {
      if (
        texto &&
        !`${d.nombre} ${d.modelo} ${d.operadorActual ?? ""}`.toLowerCase().includes(texto)
      )
        return false;
      if (filtros.estado && d.estado !== filtros.estado) return false;
      return true;
    });
  }, [drones, filtros]);

  const hayFiltrosActivos = filtros.texto !== "" || filtros.estado !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filtros.texto}
          onChange={(e) => setFiltro("texto", e.target.value)}
          placeholder="Buscar nombre, modelo u operador..."
          className={`w-full max-w-sm ${inputFiltro}`}
        />
        <select
          value={filtros.estado}
          onChange={(e) => setFiltro("estado", e.target.value as Filtros["estado"])}
          className={inputFiltro}
        >
          <option value="">Todos los estados</option>
          {ESTADO_DRONE.map((e) => (
            <option key={e} value={e}>
              {ESTADO_DRONE_LABEL[e]}
            </option>
          ))}
        </select>
        {hayFiltrosActivos && (
          <button
            onClick={() => setFiltros(FILTROS_VACIOS)}
            className="text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Limpiar filtros
          </button>
        )}
        <span className="text-xs text-green-700/60 dark:text-green-300/60">
          {filtrados.length} de {drones.length}
        </span>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Modelo</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Operador asignado</th>
                <th className="px-4 py-2 font-medium">Área Cubierta</th>
                <th className="px-4 py-2 font-medium">Horas de Vuelo</th>
                <th className="px-4 py-2 font-medium">Vuelos</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    {drones.length === 0 ? "Todavía no hay drones registrados." : "Ningún drone coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">{d.nombre}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{d.modelo}</td>
                    <td className="px-4 py-3">
                      <EstadoDroneBadge estado={d.estado} detalle={d.estadoDetalle} />
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {d.operadorActual ?? "Sin asignar"}
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{d.areaCubierta} ha</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{d.horasVuelo}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{d.vuelos}</td>
                    <td className="px-4 py-3">
                      <Link href={`/bitacora/${d.id}`} className="text-sm text-green-700 hover:underline dark:text-green-300">
                        Ver
                      </Link>
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
            {drones.length === 0 ? "Todavía no hay drones registrados." : "Ningún drone coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-green-900 dark:text-green-50">{d.nombre}</p>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">{d.modelo}</p>
                </div>
                <EstadoDroneBadge estado={d.estado} detalle={d.estadoDetalle} />
              </div>
              <p className="mt-1 text-sm text-green-800/80 dark:text-green-200/80">
                {d.operadorActual ?? "Sin asignar"} · {d.areaCubierta} ha · {d.horasVuelo} h · {d.vuelos} vuelos
              </p>
              <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                <Link href={`/bitacora/${d.id}`} className="text-sm text-green-700 hover:underline dark:text-green-300">
                  Ver
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
