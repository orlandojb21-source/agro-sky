"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarServicioAction } from "@/lib/actions/servicios";
import { formatMoney } from "@/lib/format";
import { exportarServiciosExcel, exportarServiciosPDF } from "@/lib/exportar";

export type ServicioFila = {
  id: string;
  nombre: string;
  descripcion: string | null;
  costo: number | null;
  precio: number | null;
};

type Filtros = {
  texto: string;
  precioMin: string;
  precioMax: string;
};

const FILTROS_VACIOS: Filtros = {
  texto: "",
  precioMin: "",
  precioMax: "",
};

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

const inputFiltroMovil =
  "w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

const etiquetaFiltroMovil =
  "flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70";

export function ServicioTabla({ servicios }: { servicios: ServicioFila[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    return servicios.filter((s) => {
      const texto = filtros.texto.trim().toLowerCase();
      if (texto) {
        const campos = [s.nombre, s.descripcion].filter(Boolean).join(" ").toLowerCase();
        if (!campos.includes(texto)) return false;
      }
      const precio = s.precio ?? 0;
      if (filtros.precioMin !== "" && precio < Number(filtros.precioMin)) return false;
      if (filtros.precioMax !== "" && precio > Number(filtros.precioMax)) return false;
      return true;
    });
  }, [servicios, filtros]);

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
          {filtrados.length} de {servicios.length} servicios
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportarServiciosExcel(filtrados, "agro-sky-inventario-servicios")}
            disabled={filtrados.length === 0}
            className="rounded-full border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
          >
            Exportar Excel
          </button>
          <button
            onClick={() =>
              exportarServiciosPDF(filtrados, "agro-sky-inventario-servicios", "Inventario — Servicios")
            }
            disabled={filtrados.length === 0}
            className="rounded-full border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros en movil: panel colapsable (en escritorio viven en el
          encabezado de la tabla, mas abajo). */}
      {filtrosAbiertos && (
        <div className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm sm:hidden dark:border-green-900/40 dark:bg-green-950/10">
          <label className={etiquetaFiltroMovil}>
            Buscar
            <input
              type="text"
              value={filtros.texto}
              onChange={(e) => setFiltro("texto", e.target.value)}
              placeholder="Código, descripción..."
              className={inputFiltroMovil}
            />
          </label>
          <div>
            <p className={etiquetaFiltroMovil}>Precio</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={filtros.precioMin}
                onChange={(e) => setFiltro("precioMin", e.target.value)}
                placeholder="Mín"
                className={inputFiltroMovil}
              />
              <input
                type="number"
                value={filtros.precioMax}
                onChange={(e) => setFiltro("precioMax", e.target.value)}
                placeholder="Máx"
                className={inputFiltroMovil}
              />
            </div>
          </div>
        </div>
      )}

      {/* Vista de escritorio: tabla con filtros integrados en el encabezado */}
      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Costo referencial</th>
                <th className="px-3 py-2 font-medium">Precio referencial</th>
                <th className="px-3 py-2"></th>
              </tr>
              <tr className="border-b border-green-100 bg-green-50/60 dark:border-green-900/40 dark:bg-green-950/20">
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
                      value={filtros.precioMin}
                      onChange={(e) => setFiltro("precioMin", e.target.value)}
                      placeholder="Mín"
                      className={inputFiltro}
                    />
                    <input
                      type="number"
                      value={filtros.precioMax}
                      onChange={(e) => setFiltro("precioMax", e.target.value)}
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
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70"
                  >
                    {servicios.length === 0
                      ? "Todavía no hay servicios en el catálogo."
                      : "Ningún servicio coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {s.nombre}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {s.descripcion ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {s.costo !== null ? formatMoney(s.costo) : "—"}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {s.precio !== null ? formatMoney(s.precio) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/inventario/servicios/${s.id}/editar`}
                          className="text-sm text-green-700 hover:underline dark:text-green-300"
                        >
                          Editar
                        </Link>
                        <DeleteButton action={eliminarServicioAction.bind(null, s.id)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista de movil: una tarjeta por servicio en vez de una tabla ancha */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {servicios.length === 0
              ? "Todavía no hay servicios en el catálogo."
              : "Ningún servicio coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <p className="font-medium text-green-900 dark:text-green-50">{s.nombre}</p>
              {s.descripcion && (
                <p className="mt-1 text-sm text-green-800/80 dark:text-green-200/80">
                  {s.descripcion}
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Costo referencial
                  </p>
                  <p className="text-green-900 dark:text-green-50">
                    {s.costo !== null ? formatMoney(s.costo) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Precio referencial
                  </p>
                  <p className="text-green-900 dark:text-green-50">
                    {s.precio !== null ? formatMoney(s.precio) : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                <Link
                  href={`/inventario/servicios/${s.id}/editar`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Editar
                </Link>
                <DeleteButton action={eliminarServicioAction.bind(null, s.id)} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
