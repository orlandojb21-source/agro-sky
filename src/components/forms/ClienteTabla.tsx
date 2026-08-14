"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarClienteAction } from "@/lib/actions/clientes";

export type ClienteFila = {
  id: string;
  nombre: string;
  cedula: string | null;
  ruc: string | null;
  telefono: string | null;
  correo: string | null;
};

export function ClienteTabla({
  clientes,
  puedeEscribir,
}: {
  clientes: ClienteFila[];
  puedeEscribir: boolean;
}) {
  const [texto, setTexto] = useState("");

  const filtrados = useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter((c) =>
      [c.nombre, c.cedula, c.ruc, c.telefono, c.correo].filter(Boolean).join(" ").toLowerCase().includes(t),
    );
  }, [clientes, texto]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar cliente..."
        className="w-full max-w-sm rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
      />

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Cédula</th>
                <th className="px-3 py-2 font-medium">RUC</th>
                <th className="px-3 py-2 font-medium">Teléfono</th>
                <th className="px-3 py-2 font-medium">Correo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    {clientes.length === 0 ? "Todavía no hay clientes registrados." : "Ningún cliente coincide con la búsqueda."}
                  </td>
                </tr>
              ) : (
                filtrados.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">{c.nombre}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{c.cedula ?? "—"}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{c.ruc ?? "—"}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{c.telefono ?? "—"}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{c.correo ?? "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/ventas/clientes/${c.id}/historial`}
                          className="text-sm text-green-700 hover:underline dark:text-green-300"
                        >
                          Historial
                        </Link>
                        {puedeEscribir && (
                          <>
                            <Link
                              href={`/ventas/clientes/${c.id}/editar`}
                              className="text-sm text-green-700 hover:underline dark:text-green-300"
                            >
                              Editar
                            </Link>
                            <DeleteButton action={eliminarClienteAction.bind(null, c.id)} />
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
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {clientes.length === 0 ? "Todavía no hay clientes registrados." : "Ningún cliente coincide con la búsqueda."}
          </div>
        ) : (
          filtrados.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <p className="font-medium text-green-900 dark:text-green-50">{c.nombre}</p>
              <p className="mt-1 text-sm text-green-800/80 dark:text-green-200/80">
                {c.telefono ?? "Sin teléfono"} {c.correo ? `· ${c.correo}` : ""}
              </p>
              <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                <Link
                  href={`/ventas/clientes/${c.id}/historial`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Historial
                </Link>
                {puedeEscribir && (
                  <>
                    <Link
                      href={`/ventas/clientes/${c.id}/editar`}
                      className="text-sm text-green-700 hover:underline dark:text-green-300"
                    >
                      Editar
                    </Link>
                    <DeleteButton action={eliminarClienteAction.bind(null, c.id)} />
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
