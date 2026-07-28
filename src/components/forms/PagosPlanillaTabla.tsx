"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BotonExportarTalonario } from "@/components/forms/BotonExportarTalonario";
import { eliminarPagoAction } from "@/lib/actions/planilla";
import { formatMoney, formatDateOnly } from "@/lib/format";

export type PagoFila = {
  id: string;
  colaborador: string;
  fecha: string;
  descripcion: string;
  monto: number;
  tipoTrabajo: "proyecto" | "taller" | null;
  jornada: "completo" | "medio" | null;
  esFijo: boolean;
  css: number | null;
  seguroEducativo: number | null;
  bonificacion: number | null;
};

const ETIQUETA_TIPO_TRABAJO: Record<"proyecto" | "taller", string> = {
  proyecto: "Proyecto",
  taller: "Taller",
};
const ETIQUETA_JORNADA: Record<"completo" | "medio", string> = {
  completo: "Día completo",
  medio: "Medio día",
};

function detalleTrabajo(p: PagoFila): string {
  if (p.esFijo) {
    return p.bonificacion ? `Bonificación: ${formatMoney(p.bonificacion)}` : "—";
  }
  if (!p.tipoTrabajo && !p.jornada) return "—";
  const partes = [
    p.tipoTrabajo ? ETIQUETA_TIPO_TRABAJO[p.tipoTrabajo] : null,
    p.jornada ? ETIQUETA_JORNADA[p.jornada] : null,
  ].filter(Boolean);
  return partes.join(" · ");
}

type Filtros = {
  colaborador: string;
  tipoTrabajo: string;
  texto: string;
  fechaDesde: string;
  fechaHasta: string;
};

const FILTROS_VACIOS: Filtros = {
  colaborador: "",
  tipoTrabajo: "",
  texto: "",
  fechaDesde: "",
  fechaHasta: "",
};

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

const inputFiltroMovil =
  "w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

const etiquetaFiltroMovil =
  "flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70";

export function PagosPlanillaTabla({
  pagos,
  puedeAdministrarFijos,
}: {
  pagos: PagoFila[];
  puedeAdministrarFijos: boolean;
}) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  // El filtro por colaborador se arma con los nombres que realmente
  // aparecen en los pagos cargados -- no depende de la lista administrable
  // de colaboradores, asi que sigue funcionando igual aunque alguien borre
  // un colaborador con pagos historicos.
  const nombresColaboradores = useMemo(
    () => Array.from(new Set(pagos.map((p) => p.colaborador))).sort((a, b) => a.localeCompare(b)),
    [pagos],
  );

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    return pagos.filter((p) => {
      if (filtros.colaborador && p.colaborador !== filtros.colaborador) return false;
      if (filtros.tipoTrabajo && p.tipoTrabajo !== filtros.tipoTrabajo) return false;

      const texto = filtros.texto.trim().toLowerCase();
      if (texto && !p.descripcion.toLowerCase().includes(texto)) return false;

      if (filtros.fechaDesde && p.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && p.fecha > filtros.fechaHasta) return false;

      return true;
    });
  }, [pagos, filtros]);

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
          {filtrados.length} de {pagos.length} pagos
        </span>
      </div>

      {/* Filtros en movil: panel colapsable (en escritorio viven en el
          encabezado de la tabla, mas abajo). */}
      {filtrosAbiertos && (
        <div className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm sm:hidden dark:border-green-900/40 dark:bg-green-950/10">
          <label className={etiquetaFiltroMovil}>
            Colaborador
            <select
              value={filtros.colaborador}
              onChange={(e) => setFiltro("colaborador", e.target.value)}
              className={inputFiltroMovil}
            >
              <option value="">Todos</option>
              {nombresColaboradores.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={etiquetaFiltroMovil}>
            Tipo de trabajo
            <select
              value={filtros.tipoTrabajo}
              onChange={(e) => setFiltro("tipoTrabajo", e.target.value)}
              className={inputFiltroMovil}
            >
              <option value="">Todos</option>
              <option value="proyecto">Proyecto</option>
              <option value="taller">Taller</option>
            </select>
          </label>
          <label className={etiquetaFiltroMovil}>
            Buscar en descripción
            <input
              type="text"
              value={filtros.texto}
              onChange={(e) => setFiltro("texto", e.target.value)}
              className={inputFiltroMovil}
            />
          </label>
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
        </div>
      )}

      {/* Vista de escritorio: tabla con filtros integrados en el encabezado */}
      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Colaborador</th>
                <th className="px-3 py-2 font-medium">Detalle</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
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
                    value={filtros.colaborador}
                    onChange={(e) => setFiltro("colaborador", e.target.value)}
                    className={inputFiltro}
                  >
                    <option value="">Todos</option>
                    {nombresColaboradores.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-3 py-2">
                  <select
                    value={filtros.tipoTrabajo}
                    onChange={(e) => setFiltro("tipoTrabajo", e.target.value)}
                    className={inputFiltro}
                  >
                    <option value="">Todos</option>
                    <option value="proyecto">Proyecto</option>
                    <option value="taller">Taller</option>
                  </select>
                </th>
                <th className="px-3 py-2">
                  <input
                    type="text"
                    value={filtros.texto}
                    onChange={(e) => setFiltro("texto", e.target.value)}
                    placeholder="Buscar..."
                    className={inputFiltro}
                  />
                </th>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70"
                  >
                    {pagos.length === 0
                      ? "Todavía no hay pagos registrados."
                      : "Ningún pago coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatDateOnly(p.fecha)}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {p.colaborador}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {detalleTrabajo(p)}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {p.descripcion}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-700 dark:text-green-400">
                      {formatMoney(p.monto)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        {p.esFijo && (
                          <BotonExportarTalonario
                            talonario={{
                              colaboradorNombre: p.colaborador,
                              fecha: p.fecha,
                              salarioBruto: p.monto,
                              bonificacion: p.bonificacion ?? 0,
                              css: p.css ?? 0,
                              seguroEducativo: p.seguroEducativo ?? 0,
                            }}
                          />
                        )}
                        {(puedeAdministrarFijos || !p.esFijo) && (
                          <>
                            <Link
                              href={`/planilla/${p.id}/editar`}
                              className="text-sm text-green-700 hover:underline dark:text-green-300"
                            >
                              Editar
                            </Link>
                            <DeleteButton action={eliminarPagoAction.bind(null, p.id)} />
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

      {/* Vista de movil: una tarjeta por pago */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {pagos.length === 0
              ? "Todavía no hay pagos registrados."
              : "Ningún pago coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">
                    {formatDateOnly(p.fecha)}
                  </p>
                  <p className="font-medium text-green-900 dark:text-green-50">
                    {p.colaborador}
                  </p>
                  {(p.tipoTrabajo || p.jornada || p.bonificacion) && (
                    <p className="text-xs text-green-700/70 dark:text-green-300/70">
                      {detalleTrabajo(p)}
                    </p>
                  )}
                  <p className="text-sm text-green-800/80 dark:text-green-200/80">
                    {p.descripcion}
                  </p>
                </div>
                <p className="shrink-0 font-medium text-green-700 dark:text-green-400">
                  {formatMoney(p.monto)}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                {p.esFijo && (
                  <BotonExportarTalonario
                    talonario={{
                      colaboradorNombre: p.colaborador,
                      fecha: p.fecha,
                      salarioBruto: p.monto,
                      bonificacion: p.bonificacion ?? 0,
                      css: p.css ?? 0,
                      seguroEducativo: p.seguroEducativo ?? 0,
                    }}
                  />
                )}
                {(puedeAdministrarFijos || !p.esFijo) && (
                  <>
                    <Link
                      href={`/planilla/${p.id}/editar`}
                      className="text-sm text-green-700 hover:underline dark:text-green-300"
                    >
                      Editar
                    </Link>
                    <DeleteButton action={eliminarPagoAction.bind(null, p.id)} />
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
