"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarControlHorarioAction } from "@/lib/actions/controlHorario";
import { formatDateOnly } from "@/lib/format";

export type ControlHorarioFila = {
  id: string;
  colaborador: string;
  fecha: string;
  cumplio: boolean;
  nota: string | null;
};

type Filtros = {
  texto: string;
  cumplio: "" | "si" | "no";
  fechaDesde: string;
  fechaHasta: string;
};

const FILTROS_VACIOS: Filtros = { texto: "", cumplio: "", fechaDesde: "", fechaHasta: "" };

const inputFiltro =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function ControlHorarioTabla({
  registros,
  puedeEscribir,
}: {
  registros: ControlHorarioFila[];
  puedeEscribir: boolean;
}) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    const texto = filtros.texto.trim().toLowerCase();
    return registros.filter((r) => {
      if (texto && !r.colaborador.toLowerCase().includes(texto)) return false;
      if (filtros.cumplio === "si" && !r.cumplio) return false;
      if (filtros.cumplio === "no" && r.cumplio) return false;
      if (filtros.fechaDesde && r.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && r.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [registros, filtros]);

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filtros.texto}
          onChange={(e) => setFiltro("texto", e.target.value)}
          placeholder="Buscar colaborador..."
          className={`w-full max-w-sm ${inputFiltro}`}
        />
        <select
          value={filtros.cumplio}
          onChange={(e) => setFiltro("cumplio", e.target.value as Filtros["cumplio"])}
          className={inputFiltro}
        >
          <option value="">Todos</option>
          <option value="si">Cumplió</option>
          <option value="no">No cumplió</option>
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
        <span className="text-xs text-green-700/60 dark:text-green-300/60">
          {filtrados.length} de {registros.length}
        </span>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Colaborador</th>
                <th className="px-4 py-2 font-medium">Asistencia</th>
                <th className="px-4 py-2 font-medium">Nota</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    {registros.length === 0
                      ? "Todavía no hay registros de horario."
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
                    <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">{r.colaborador}</td>
                    <td className="px-4 py-3">
                      {r.cumplio ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                          Sí
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{r.nota ?? "—"}</td>
                    <td className="px-4 py-3">
                      {puedeEscribir && (
                        <div className="flex gap-3">
                          <Link
                            href={`/planilla/horario/${r.id}/editar`}
                            className="text-sm text-green-700 hover:underline dark:text-green-300"
                          >
                            Editar
                          </Link>
                          <DeleteButton
                            action={eliminarControlHorarioAction.bind(null, r.id)}
                            confirmMessage="¿Eliminar este registro? Esta acción no se puede deshacer."
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
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {registros.length === 0
              ? "Todavía no hay registros de horario."
              : "Ningún registro coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">{formatDateOnly(r.fecha)}</p>
                  <p className="font-medium text-green-900 dark:text-green-50">{r.colaborador}</p>
                  {r.nota && <p className="text-xs text-green-700/60 dark:text-green-300/60">{r.nota}</p>}
                </div>
                {r.cumplio ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    Sí
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                    No
                  </span>
                )}
              </div>
              {puedeEscribir && (
                <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                  <Link
                    href={`/planilla/horario/${r.id}/editar`}
                    className="text-sm text-green-700 hover:underline dark:text-green-300"
                  >
                    Editar
                  </Link>
                  <DeleteButton
                    action={eliminarControlHorarioAction.bind(null, r.id)}
                    confirmMessage="¿Eliminar este registro? Esta acción no se puede deshacer."
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
