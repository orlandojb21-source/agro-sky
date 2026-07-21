"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarProductoAction } from "@/lib/actions/productos";
import { formatMoney } from "@/lib/format";
import { exportarExcel, exportarPDF } from "@/lib/exportar";

export type ProductoFila = {
  id: string;
  numeroParte: string;
  descripcion: string;
  cantidad: number;
  costo: number;
  venta: number;
  fila: string | null;
  contenedor: string | null;
  unidad: string | null;
};

type Filtros = {
  numeroParte: string;
  descripcion: string;
  fila: string;
  contenedor: string;
  unidad: string;
  cantidadMin: string;
  cantidadMax: string;
  costoMin: string;
  costoMax: string;
};

const FILTROS_VACIOS: Filtros = {
  numeroParte: "",
  descripcion: "",
  fila: "",
  contenedor: "",
  unidad: "",
  cantidadMin: "",
  cantidadMax: "",
  costoMin: "",
  costoMax: "",
};

const inputFiltro =
  "w-full min-w-0 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-normal normal-case text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

const inputFiltroMovil =
  "w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

const etiquetaFiltroMovil =
  "flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70";

function FiltroTexto({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Filtrar..."}
      className={inputFiltro}
    />
  );
}

function FiltroTextoMovil({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Filtrar..."}
      className={inputFiltroMovil}
    />
  );
}

function FiltroRangoMovil({
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  min: string;
  max: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="number"
        value={min}
        onChange={(e) => onMinChange(e.target.value)}
        placeholder="Mín"
        className={inputFiltroMovil}
      />
      <input
        type="number"
        value={max}
        onChange={(e) => onMaxChange(e.target.value)}
        placeholder="Máx"
        className={inputFiltroMovil}
      />
    </div>
  );
}

function FiltroRango({
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  min: string;
  max: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1">
      <input
        type="number"
        value={min}
        onChange={(e) => onMinChange(e.target.value)}
        placeholder="Mín"
        className={inputFiltro}
      />
      <input
        type="number"
        value={max}
        onChange={(e) => onMaxChange(e.target.value)}
        placeholder="Máx"
        className={inputFiltro}
      />
    </div>
  );
}

export function ProductoTabla({
  productos,
  seccion,
  seccionHref,
  titulo,
}: {
  productos: ProductoFila[];
  seccion: string;
  seccionHref: string;
  titulo: string;
}) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    return productos.filter((p) => {
      const numeroParte = filtros.numeroParte.trim().toLowerCase();
      if (numeroParte && !p.numeroParte.toLowerCase().includes(numeroParte)) return false;

      const descripcion = filtros.descripcion.trim().toLowerCase();
      if (descripcion && !p.descripcion.toLowerCase().includes(descripcion)) return false;

      const fila = filtros.fila.trim().toLowerCase();
      if (fila && !(p.fila ?? "").toLowerCase().includes(fila)) return false;

      const contenedor = filtros.contenedor.trim().toLowerCase();
      if (contenedor && !(p.contenedor ?? "").toLowerCase().includes(contenedor)) return false;

      const unidad = filtros.unidad.trim().toLowerCase();
      if (unidad && !(p.unidad ?? "").toLowerCase().includes(unidad)) return false;

      if (filtros.cantidadMin !== "" && p.cantidad < Number(filtros.cantidadMin)) return false;
      if (filtros.cantidadMax !== "" && p.cantidad > Number(filtros.cantidadMax)) return false;
      if (filtros.costoMin !== "" && p.costo < Number(filtros.costoMin)) return false;
      if (filtros.costoMax !== "" && p.costo > Number(filtros.costoMax)) return false;

      return true;
    });
  }, [productos, filtros]);

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "");
  const nombreArchivo = `agro-sky-inventario-${seccion}`;

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
          {filtrados.length} de {productos.length} productos
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportarExcel(filtrados, nombreArchivo)}
            disabled={filtrados.length === 0}
            className="rounded-full border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
          >
            Exportar Excel
          </button>
          <button
            onClick={() => exportarPDF(filtrados, nombreArchivo, titulo)}
            disabled={filtrados.length === 0}
            className="rounded-full border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros en movil: panel colapsable con etiquetas (en escritorio los
          filtros viven dentro del encabezado de la tabla, mas abajo). */}
      {filtrosAbiertos && (
        <div className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm sm:hidden dark:border-green-900/40 dark:bg-green-950/10">
          <label className={etiquetaFiltroMovil}>
            Número de parte
            <FiltroTextoMovil
              value={filtros.numeroParte}
              onChange={(v) => setFiltro("numeroParte", v)}
            />
          </label>
          <label className={etiquetaFiltroMovil}>
            Descripción
            <FiltroTextoMovil
              value={filtros.descripcion}
              onChange={(v) => setFiltro("descripcion", v)}
            />
          </label>
          <label className={etiquetaFiltroMovil}>
            Fila
            <FiltroTextoMovil value={filtros.fila} onChange={(v) => setFiltro("fila", v)} />
          </label>
          <label className={etiquetaFiltroMovil}>
            Contenedor
            <FiltroTextoMovil
              value={filtros.contenedor}
              onChange={(v) => setFiltro("contenedor", v)}
            />
          </label>
          <label className={etiquetaFiltroMovil}>
            Unidad
            <FiltroTextoMovil value={filtros.unidad} onChange={(v) => setFiltro("unidad", v)} />
          </label>
          <div>
            <p className={etiquetaFiltroMovil}>Cantidad</p>
            <FiltroRangoMovil
              min={filtros.cantidadMin}
              max={filtros.cantidadMax}
              onMinChange={(v) => setFiltro("cantidadMin", v)}
              onMaxChange={(v) => setFiltro("cantidadMax", v)}
            />
          </div>
          <div>
            <p className={etiquetaFiltroMovil}>Costo</p>
            <FiltroRangoMovil
              min={filtros.costoMin}
              max={filtros.costoMax}
              onMinChange={(v) => setFiltro("costoMin", v)}
              onMaxChange={(v) => setFiltro("costoMax", v)}
            />
          </div>
        </div>
      )}

      {/* Vista de escritorio: tabla con filtros integrados en el encabezado */}
      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Número de parte</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Fila</th>
                <th className="px-3 py-2 font-medium">Contenedor</th>
                <th className="px-3 py-2 font-medium">Unidad</th>
                <th className="px-3 py-2 font-medium">Cantidad</th>
                <th className="px-3 py-2 font-medium">Costo</th>
                <th className="px-3 py-2 font-medium">Valor de Inventario</th>
                <th className="px-3 py-2 font-medium">Venta</th>
                <th className="px-3 py-2"></th>
              </tr>
              <tr className="border-b border-green-100 bg-green-50/60 dark:border-green-900/40 dark:bg-green-950/20">
                <th className="px-3 py-2">
                  <FiltroTexto
                    value={filtros.numeroParte}
                    onChange={(v) => setFiltro("numeroParte", v)}
                  />
                </th>
                <th className="px-3 py-2">
                  <FiltroTexto
                    value={filtros.descripcion}
                    onChange={(v) => setFiltro("descripcion", v)}
                  />
                </th>
                <th className="px-3 py-2">
                  <FiltroTexto value={filtros.fila} onChange={(v) => setFiltro("fila", v)} />
                </th>
                <th className="px-3 py-2">
                  <FiltroTexto
                    value={filtros.contenedor}
                    onChange={(v) => setFiltro("contenedor", v)}
                  />
                </th>
                <th className="px-3 py-2">
                  <FiltroTexto value={filtros.unidad} onChange={(v) => setFiltro("unidad", v)} />
                </th>
                <th className="px-3 py-2">
                  <FiltroRango
                    min={filtros.cantidadMin}
                    max={filtros.cantidadMax}
                    onMinChange={(v) => setFiltro("cantidadMin", v)}
                    onMaxChange={(v) => setFiltro("cantidadMax", v)}
                  />
                </th>
                <th className="px-3 py-2">
                  <FiltroRango
                    min={filtros.costoMin}
                    max={filtros.costoMax}
                    onMinChange={(v) => setFiltro("costoMin", v)}
                    onMaxChange={(v) => setFiltro("costoMax", v)}
                  />
                </th>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2"></th>
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
                    {productos.length === 0
                      ? "Todavía no hay productos en esta sección."
                      : "Ningún producto coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {p.numeroParte}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {p.descripcion}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {p.fila ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {p.contenedor ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {p.unidad ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      {p.cantidad === 0 ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                          Sin stock
                        </span>
                      ) : (
                        p.cantidad
                      )}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(p.costo)}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(p.costo * p.cantidad)}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(p.venta)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`${seccionHref}/${p.id}/editar`}
                          className="text-sm text-green-700 hover:underline dark:text-green-300"
                        >
                          Editar
                        </Link>
                        <DeleteButton
                          action={eliminarProductoAction.bind(null, p.id, seccion)}
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

      {/* Vista de movil: una tarjeta por producto en vez de una tabla ancha */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {productos.length === 0
              ? "Todavía no hay productos en esta sección."
              : "Ningún producto coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-green-900 dark:text-green-50">{p.numeroParte}</p>
                  <p className="text-sm text-green-800/80 dark:text-green-200/80">
                    {p.descripcion}
                  </p>
                </div>
                {p.cantidad === 0 && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    Sin stock
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Fila
                  </p>
                  <p className="text-green-900 dark:text-green-50">{p.fila ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Contenedor
                  </p>
                  <p className="text-green-900 dark:text-green-50">{p.contenedor ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Unidad
                  </p>
                  <p className="text-green-900 dark:text-green-50">{p.unidad ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Cantidad
                  </p>
                  <p className="text-green-900 dark:text-green-50">{p.cantidad}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Costo
                  </p>
                  <p className="text-green-900 dark:text-green-50">{formatMoney(p.costo)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Valor de Inventario
                  </p>
                  <p className="text-green-900 dark:text-green-50">
                    {formatMoney(p.costo * p.cantidad)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Venta
                  </p>
                  <p className="text-green-900 dark:text-green-50">{formatMoney(p.venta)}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                <Link
                  href={`${seccionHref}/${p.id}/editar`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Editar
                </Link>
                <DeleteButton action={eliminarProductoAction.bind(null, p.id, seccion)} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
