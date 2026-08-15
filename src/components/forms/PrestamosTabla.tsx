"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarPrestamoAction } from "@/lib/actions/prestamos";
import { formatDateOnly, formatMoney } from "@/lib/format";

export type PrestamoFila = {
  id: string;
  colaborador: string;
  fecha: string;
  monto: number;
  cuotaQuincenal: number;
  nota: string | null;
  saldoPendiente: number;
};

type Filtros = {
  colaborador: string;
  estado: "" | "pendiente" | "pagado";
  fechaDesde: string;
  fechaHasta: string;
};

const FILTROS_VACIOS: Filtros = { colaborador: "", estado: "", fechaDesde: "", fechaHasta: "" };

function coincide(valor: string, filtro: string) {
  if (!filtro.trim()) return true;
  return valor.toLowerCase().includes(filtro.trim().toLowerCase());
}

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

export function PrestamosTabla({
  prestamos,
  puedeEscribir,
}: {
  prestamos: PrestamoFila[];
  puedeEscribir: boolean;
}) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    return prestamos.filter((p) => {
      if (!coincide(p.colaborador, filtros.colaborador)) return false;
      if (filtros.estado === "pagado" && p.saldoPendiente > 0) return false;
      if (filtros.estado === "pendiente" && p.saldoPendiente <= 0) return false;
      if (filtros.fechaDesde && p.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && p.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [prestamos, filtros]);

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "");

  return (
    <div className="flex flex-col gap-4">
      <span className="text-xs text-green-700/60 dark:text-green-300/60">
        {filtrados.length} de {prestamos.length}
      </span>

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-4 pt-2 font-medium">Colaborador</th>
                <th className="px-4 pt-2 font-medium">Fecha</th>
                <th className="px-4 pt-2 font-medium">Monto prestado</th>
                <th className="px-4 pt-2 font-medium">Cuota sugerida</th>
                <th className="px-4 pt-2 font-medium">Saldo pendiente</th>
                <th className="px-4 pt-2"></th>
              </tr>
              <tr className="border-b border-green-100 bg-green-50 dark:border-green-900/40 dark:bg-green-950/30">
                <th className="px-4 pb-2">
                  <input
                    type="text"
                    value={filtros.colaborador}
                    onChange={(e) => setFiltro("colaborador", e.target.value)}
                    placeholder="Filtrar..."
                    className={inputFiltro}
                  />
                </th>
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
                <th className="px-4 pb-2"></th>
                <th className="px-4 pb-2"></th>
                <th className="px-4 pb-2">
                  <select
                    value={filtros.estado}
                    onChange={(e) => setFiltro("estado", e.target.value as Filtros["estado"])}
                    className={inputFiltro}
                  >
                    <option value="">Todos</option>
                    <option value="pendiente">Con saldo</option>
                    <option value="pagado">Pagado</option>
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
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    {prestamos.length === 0
                      ? "Todavía no hay préstamos registrados."
                      : "Ningún préstamo coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                      <Link href={`/planilla/prestamos/${p.id}`} className="hover:underline">
                        {p.colaborador}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{formatDateOnly(p.fecha)}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{formatMoney(p.monto)}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(p.cuotaQuincenal)}
                    </td>
                    <td className="px-4 py-3">
                      {p.saldoPendiente <= 0 ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                          Pagado
                        </span>
                      ) : (
                        <span className="font-medium text-red-700 dark:text-red-400">
                          {formatMoney(p.saldoPendiente)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/planilla/prestamos/${p.id}`}
                          className="text-sm text-green-700 hover:underline dark:text-green-300"
                        >
                          Ver detalle
                        </Link>
                        {puedeEscribir && (
                          <>
                            <Link
                              href={`/planilla/prestamos/${p.id}/editar`}
                              className="text-sm text-green-700 hover:underline dark:text-green-300"
                            >
                              Editar
                            </Link>
                            <DeleteButton
                              action={eliminarPrestamoAction.bind(null, p.id)}
                              confirmMessage={`¿Eliminar el préstamo de ${p.colaborador}? Solo se puede si todavía no tiene abonos registrados.`}
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

      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-green-100 bg-white p-3 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <input
            type="text"
            value={filtros.colaborador}
            onChange={(e) => setFiltro("colaborador", e.target.value)}
            placeholder="Buscar colaborador..."
            className={`w-full ${inputFiltro}`}
          />
          <select
            value={filtros.estado}
            onChange={(e) => setFiltro("estado", e.target.value as Filtros["estado"])}
            className={inputFiltro}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Con saldo pendiente</option>
            <option value="pagado">Pagado</option>
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
            {prestamos.length === 0
              ? "Todavía no hay préstamos registrados."
              : "Ningún préstamo coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/planilla/prestamos/${p.id}`} className="font-medium text-green-900 hover:underline dark:text-green-50">
                    {p.colaborador}
                  </Link>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">{formatDateOnly(p.fecha)}</p>
                </div>
                {p.saldoPendiente <= 0 ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                    Pagado
                  </span>
                ) : (
                  <span className="font-medium text-red-700 dark:text-red-400">
                    {formatMoney(p.saldoPendiente)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-green-800/80 dark:text-green-200/80">
                {formatMoney(p.monto)} · cuota {formatMoney(p.cuotaQuincenal)}
              </p>
              <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                <Link
                  href={`/planilla/prestamos/${p.id}`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Ver detalle
                </Link>
                {puedeEscribir && (
                  <>
                    <Link
                      href={`/planilla/prestamos/${p.id}/editar`}
                      className="text-sm text-green-700 hover:underline dark:text-green-300"
                    >
                      Editar
                    </Link>
                    <DeleteButton
                      action={eliminarPrestamoAction.bind(null, p.id)}
                      confirmMessage={`¿Eliminar el préstamo de ${p.colaborador}? Solo se puede si todavía no tiene abonos registrados.`}
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
