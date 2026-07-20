"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarProductoAction } from "@/lib/actions/productos";
import { formatMoney } from "@/lib/format";

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

export function ProductoTabla({
  productos,
  seccion,
  seccionHref,
}: {
  productos: ProductoFila[];
  seccion: string;
  seccionHref: string;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.numeroParte.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q),
    );
  }, [productos, busqueda]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por número de parte o descripción..."
        className="w-full max-w-sm rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
      />

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-green-100 bg-white px-6 py-10 text-center text-sm text-green-700/70 dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
          {productos.length === 0
            ? "Todavía no hay productos en esta sección."
            : "Ningún producto coincide con la búsqueda."}
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
