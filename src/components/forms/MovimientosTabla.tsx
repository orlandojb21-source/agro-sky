"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { DenominacionGrid } from "@/components/forms/DenominacionGrid";
import {
  eliminarGastoAction,
  eliminarReposicionAction,
  registrarVueltoAction,
} from "@/lib/actions/caja";
import { formatMoney, formatDateOnly } from "@/lib/format";

export type MovimientoFila = {
  id: string;
  tipo: "gasto" | "reposicion";
  fecha: string;
  monto: number | null;
  nombre: string | null;
  concepto: string | null;
  colaborador: string | null;
  previsto: number | null;
  entregado: number | null;
  vuelto: number | null;
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

const inputFiltroMovil =
  "w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

const etiquetaFiltroMovil =
  "flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70";

function salidaEfectiva(m: MovimientoFila): number {
  if (m.tipo === "reposicion") return m.monto ?? 0;
  return m.entregado ?? m.monto ?? 0;
}

function RegistrarVuelto({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-xs text-green-700 hover:underline dark:text-green-300"
      >
        Registrar vuelto
      </button>
    );
  }

  return (
    <form
      action={registrarVueltoAction.bind(null, id)}
      className="flex w-full max-w-[260px] flex-col gap-2 rounded-lg border border-green-200 bg-green-50/60 p-2 dark:border-green-800 dark:bg-green-950/20"
    >
      <DenominacionGrid prefijo="vuelto" compacto />
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs text-green-700/70 hover:underline dark:text-green-300/70"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="text-xs font-medium text-green-700 hover:underline dark:text-green-300"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}

export function MovimientosTabla({ movimientos }: { movimientos: MovimientoFila[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

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
      const monto = salidaEfectiva(m);
      if (filtros.montoMin !== "" && monto < Number(filtros.montoMin)) return false;
      if (filtros.montoMax !== "" && monto > Number(filtros.montoMax)) return false;

      return true;
    });
  }, [movimientos, filtros]);

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFiltrosAbiertos((v) => !v)}
          className="rounded-full border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40 sm:hidden"
        >
          {filtrosAbiertos ? "Ocultar filtros" : "Filtrar"}
        </button>
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

      {/* Filtros en movil: panel colapsable (en escritorio viven en el
          encabezado de la tabla, mas abajo). */}
      {filtrosAbiertos && (
        <div className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm sm:hidden dark:border-green-900/40 dark:bg-green-950/10">
          <div className="grid grid-cols-2 gap-3">
            <label className={etiquetaFiltroMovil}>
              Desde
              <input
                type="date"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltro("fechaDesde", e.target.value)}
                className={inputFiltroMovil}
              />
            </label>
            <label className={etiquetaFiltroMovil}>
              Hasta
              <input
                type="date"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltro("fechaHasta", e.target.value)}
                className={inputFiltroMovil}
              />
            </label>
          </div>
          <label className={etiquetaFiltroMovil}>
            Tipo
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltro("tipo", e.target.value as Filtros["tipo"])}
              className={inputFiltroMovil}
            >
              <option value="">Todos</option>
              <option value="gasto">Gasto</option>
              <option value="reposicion">Reposición</option>
            </select>
          </label>
          <label className={etiquetaFiltroMovil}>
            Buscar
            <input
              type="text"
              value={filtros.texto}
              onChange={(e) => setFiltro("texto", e.target.value)}
              placeholder="Nombre, concepto, colaborador..."
              className={inputFiltroMovil}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={etiquetaFiltroMovil}>
              Monto mín
              <input
                type="number"
                value={filtros.montoMin}
                onChange={(e) => setFiltro("montoMin", e.target.value)}
                className={inputFiltroMovil}
              />
            </label>
            <label className={etiquetaFiltroMovil}>
              Monto máx
              <input
                type="number"
                value={filtros.montoMax}
                onChange={(e) => setFiltro("montoMax", e.target.value)}
                className={inputFiltroMovil}
              />
            </label>
          </div>
        </div>
      )}

      {/* Vista de escritorio: tabla con filtros integrados en el encabezado */}
      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Nombre / Nota</th>
                <th className="px-3 py-2 font-medium">Concepto</th>
                <th className="px-3 py-2 font-medium">Colaborador</th>
                <th className="px-3 py-2 font-medium">Previsto</th>
                <th className="px-3 py-2 font-medium">Entregado</th>
                <th className="px-3 py-2 font-medium">Vuelto</th>
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
                <th className="px-3 py-2" colSpan={3}>
                  <input
                    type="text"
                    value={filtros.texto}
                    onChange={(e) => setFiltro("texto", e.target.value)}
                    placeholder="Buscar..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-3 py-2" colSpan={2}></th>
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
                    colSpan={10}
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
                      {formatDateOnly(m.fecha)}
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
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {m.previsto !== null ? formatMoney(m.previsto) : "—"}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {m.entregado !== null ? formatMoney(m.entregado) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {m.vuelto !== null ? (
                        <span className="text-green-800/80 dark:text-green-200/80">
                          {formatMoney(m.vuelto)}
                        </span>
                      ) : m.entregado !== null ? (
                        <RegistrarVuelto id={m.id} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className={
                        m.tipo === "gasto"
                          ? "px-3 py-3 font-medium text-red-700 dark:text-red-400"
                          : "px-3 py-3 font-medium text-green-700 dark:text-green-400"
                      }
                    >
                      {m.tipo === "gasto" ? "−" : "+"}
                      {formatMoney(salidaEfectiva(m))}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={
                            m.tipo === "gasto"
                              ? `/caja-menuda/movimiento/${m.id}/editar`
                              : `/caja-menuda/reposicion/${m.id}/editar`
                          }
                          className="text-sm text-green-700 hover:underline dark:text-green-300"
                        >
                          Editar
                        </Link>
                        <DeleteButton
                          action={
                            m.tipo === "gasto"
                              ? eliminarGastoAction.bind(null, m.id)
                              : eliminarReposicionAction.bind(null, m.id)
                          }
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

      {/* Vista de movil: una tarjeta por movimiento en vez de una tabla ancha */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {movimientos.length === 0
              ? "Todavía no hay movimientos registrados."
              : "Ningún movimiento coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((m) => (
            <div
              key={`${m.tipo}-${m.id}`}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">
                    {formatDateOnly(m.fecha)}
                  </p>
                  <p className="font-medium text-green-900 dark:text-green-50">
                    {m.nombre ?? m.nota ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {m.tipo === "gasto" ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                      Gasto
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                      Reposición
                    </span>
                  )}
                  <p
                    className={
                      m.tipo === "gasto"
                        ? "font-medium text-red-700 dark:text-red-400"
                        : "font-medium text-green-700 dark:text-green-400"
                    }
                  >
                    {m.tipo === "gasto" ? "−" : "+"}
                    {formatMoney(salidaEfectiva(m))}
                  </p>
                </div>
              </div>

              {(m.concepto || m.colaborador || m.previsto !== null || m.entregado !== null) && (
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  {m.concepto && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                        Concepto
                      </p>
                      <p className="text-green-900 dark:text-green-50">{m.concepto}</p>
                    </div>
                  )}
                  {m.colaborador && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                        Colaborador
                      </p>
                      <p className="text-green-900 dark:text-green-50">{m.colaborador}</p>
                    </div>
                  )}
                  {m.previsto !== null && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                        Previsto
                      </p>
                      <p className="text-green-900 dark:text-green-50">
                        {formatMoney(m.previsto)}
                      </p>
                    </div>
                  )}
                  {m.entregado !== null && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                        Entregado
                      </p>
                      <p className="text-green-900 dark:text-green-50">
                        {formatMoney(m.entregado)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {m.entregado !== null && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-green-50 pt-3 dark:border-green-900/30">
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Vuelto
                  </p>
                  {m.vuelto !== null ? (
                    <span className="text-sm text-green-900 dark:text-green-50">
                      {formatMoney(m.vuelto)}
                    </span>
                  ) : (
                    <RegistrarVuelto id={m.id} />
                  )}
                </div>
              )}

              <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                <Link
                  href={
                    m.tipo === "gasto"
                      ? `/caja-menuda/movimiento/${m.id}/editar`
                      : `/caja-menuda/reposicion/${m.id}/editar`
                  }
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Editar
                </Link>
                <DeleteButton
                  action={
                    m.tipo === "gasto"
                      ? eliminarGastoAction.bind(null, m.id)
                      : eliminarReposicionAction.bind(null, m.id)
                  }
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
