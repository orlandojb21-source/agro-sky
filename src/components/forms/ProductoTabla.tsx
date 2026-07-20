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
  rack: string | null;
  contenedor: string | null;
};

type Filtros = {
  numeroParte: string;
  descripcion: string;
  rack: string;
  contenedor: string;
  cantidadMin: string;
  cantidadMax: string;
  costoMin: string;
  costoMax: string;
};

const FILTROS_VACIOS: Filtros = {
  numeroParte: "",
  descripcion: "",
  rack: "",
  contenedor: "",
  cantidadMin: "",
  cantidadMax: "",
  costoMin: "",
  costoMax: "",
};

function campoFiltro(
  label: string,
  value: string,
  onChange: (v: string) => void,
  type: "text" | "number" = "text",
) {
  return (
    <label className="flex flex-col gap-1 text-xs text-green-800 dark:text-green-200">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-green-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
      />
    </label>
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

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    return productos.filter((p) => {
      const numeroParte = filtros.numeroParte.trim().toLowerCase();
      if (numeroParte && !p.numeroParte.toLowerCase().includes(numeroParte)) return false;

      const descripcion = filtros.descripcion.trim().toLowerCase();
      if (descripcion && !p.descripcion.toLowerCase().includes(descripcion)) return false;

      const rack = filtros.rack.trim().toLowerCase();
      if (rack && !(p.rack ?? "").toLowerCase().includes(rack)) return false;

      const contenedor = filtros.contenedor.trim().toLowerCase();
      if (contenedor && !(p.contenedor ?? "").toLowerCase().includes(contenedor)) return false;

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
      <div className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {campoFiltro("Número de parte", filtros.numeroParte, (v) => setFiltro("numeroParte", v))}
          {campoFiltro("Descripción", filtros.descripcion, (v) => setFiltro("descripcion", v))}
          {campoFiltro("Rack", filtros.rack, (v) => setFiltro("rack", v))}
          {campoFiltro("Contenedor", filtros.contenedor, (v) => setFiltro("contenedor", v))}
          {campoFiltro("Cantidad mín.", filtros.cantidadMin, (v) => setFiltro("cantidadMin", v), "number")}
          {campoFiltro("Cantidad máx.", filtros.cantidadMax, (v) => setFiltro("cantidadMax", v), "number")}
          {campoFiltro("Costo mín.", filtros.costoMin, (v) => setFiltro("costoMin", v), "number")}
          {campoFiltro("Costo máx.", filtros.costoMax, (v) => setFiltro("costoMax", v), "number")}
        </div>

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
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-green-100 bg-white px-6 py-10 text-center text-sm text-green-700/70 dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
          {productos.length === 0
            ? "Todavía no hay productos en esta sección."
            : "Ningún producto coincide con los filtros."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                  <th className="px-4 py-3 font-medium">Número de parte</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">Costo</th>
                  <th className="px-4 py-3 font-medium">Venta</th>
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                      {p.numeroParte}
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {p.descripcion}
                    </td>
                    <td className="px-4 py-3">
                      {p.cantidad === 0 ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                          Sin stock
                        </span>
                      ) : (
                        p.cantidad
                      )}
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(p.costo)}
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(p.venta)}
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {p.rack ? `${p.rack} / ${p.contenedor}` : "Sin asignar"}
                    </td>
                    <td className="px-4 py-3">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
