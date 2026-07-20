"use client";

import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarGastoAction, eliminarReposicionAction } from "@/lib/actions/caja";
import { formatMoney, formatDate } from "@/lib/format";

export type MovimientoFila = {
  id: string;
  tipo: "gasto" | "reposicion";
  fecha: string;
  monto: number;
  nombre: string | null;
  concepto: string | null;
  colaborador: string | null;
  nota: string | null;
};

type Filtros = {
  tipo: "" | "gasto" | "reposicion";
  texto: string;
  fechaDesde: string;
  fechaHasta: string;
  montoMin: string;
  montoMax: string;
};

const FILTROS_VACIOS: Filtros = {
  tipo: "",
  texto: "",
  fechaDesde: "",
  fechaHasta: "",
  montoMin: "",
  montoMax: "",
};

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

export function MovimientosTabla({ movimientos }: { movimientos: MovimientoFila[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (filtros.tipo && m.tipo !== filtros.tipo) return false;

      const texto = filtros.texto.trim().toLowerCase();
      if (texto) {
        const campos = [m.nombre, m.concepto, m.colaborador, m.nota]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!campos.includes(texto)) return false;
      }

      if (filtros.fechaDesde && m.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && m.fecha > filtros.fechaHasta) return false;
      if (filtros.montoMin !== "" && m.monto < Number(filtros.montoMin)) return false;
      if (filtros.montoMax !== "" && m.monto > Number(filtros.montoMax)) return false;

      return true;
    });
  }, [movimientos, filtros]);

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
          {filtrados.length} de {movimientos.length} movimientos
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Nombre / Nota</th>
                <th className="px-3 py-2 font-medium">Concepto</th>
                <th className="px-3 py-2 font-medium">Colaborador</th>
                <th className="px-3 py-2 font-medium">Monto</th>
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
                  <select
                    value={filtros.tipo}
                    onChange={(e) => setFiltro("tipo", e.target.value as Filtros["tipo"])}
                    className={inputFiltro}
                  >
                    <option value="">Todos</option>
                    <option value="gasto">Gasto</option>
                    <option value="reposicion">Reposición</option>
                  </select>
                </th>
                <th className="px-3 py-2" colSpan={2}>
                  <input
                    type="text"
                    value={filtros.texto}
                    onChange={(e) => setFiltro("texto", e.target.value)}
                    placeholder="Buscar..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={filtros.montoMin}
                      onChange={(e) => setFiltro("montoMin", e.target.value)}
                      placeholder="Mín"
                      className={inputFiltro}
                    />
                    <input
                      type="number"
                      value={filtros.montoMax}
                      onChange={(e) => setFiltro("montoMax", e.target.value)}
                      placeholder="Máx"
                      className={inputFiltro}
                    />
                  </div>
                </th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70"
                  >
                    {movimientos.length === 0
                      ? "Todavía no hay movimientos registrados."
                      : "Ningún movimiento coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((m) => (
                  <tr
                    key={`${m.tipo}-${m.id}`}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatDate(m.fecha)}
                    </td>
                    <td className="px-3 py-3">
                      {m.tipo === "gasto" ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                          Gasto
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                          Reposición
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {m.nombre ?? m.nota ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {m.concepto ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {m.colaborador ?? "—"}
                    </td>
                    <td
                      className={
                        m.tipo === "gasto"
                          ? "px-3 py-3 font-medium text-red-700 dark:text-red-400"
                          : "px-3 py-3 font-medium text-green-700 dark:text-green-400"
                      }
                    >
                      {m.tipo === "gasto" ? "−" : "+"}
                      {formatMoney(m.monto)}
                    </td>
                    <td className="px-3 py-3">
                      <DeleteButton
                        action={
                          m.tipo === "gasto"
                            ? eliminarGastoAction.bind(null, m.id)
                            : eliminarReposicionAction.bind(null, m.id)
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
