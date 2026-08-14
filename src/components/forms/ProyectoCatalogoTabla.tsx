"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarProyectoCatalogoAction } from "@/lib/actions/proyectosCatalogo";

export type ProyectoCatalogoFila = {
  id: string;
  codigo: string;
  nombre: string;
  clienteNombre: string;
  tipoProyecto: "ingenio_santa_rosa" | "particular";
  estado: "abierto" | "cerrado";
  // Suma de las hectáreas de todas las parcelas de todos los Informes de
  // Campo ligados a este Proyecto (ver informes/proyectos/page.tsx).
  hectareas: number;
};

function etiquetaTipo(tipo: "ingenio_santa_rosa" | "particular") {
  return tipo === "ingenio_santa_rosa" ? "Ingenio Santa Rosa" : "Trabajo Particular";
}

function BadgeEstado({ estado }: { estado: "abierto" | "cerrado" }) {
  if (estado === "abierto") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
        Abierto
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
      Cerrado
    </span>
  );
}

export function ProyectoCatalogoTabla({
  proyectos,
  puedeEscribir,
}: {
  proyectos: ProyectoCatalogoFila[];
  puedeEscribir: boolean;
}) {
  const [texto, setTexto] = useState("");

  const filtrados = useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return proyectos;
    return proyectos.filter((p) =>
      [p.codigo, p.nombre, p.clienteNombre].join(" ").toLowerCase().includes(t),
    );
  }, [proyectos, texto]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar código, nombre o cliente..."
        className="w-full max-w-sm rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
      />

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Hectáreas</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    {proyectos.length === 0 ? "Todavía no hay proyectos registrados." : "Ningún proyecto coincide con la búsqueda."}
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">{p.codigo}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{p.nombre}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{p.clienteNombre}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{etiquetaTipo(p.tipoProyecto)}</td>
                    <td className="px-3 py-3">
                      <BadgeEstado estado={p.estado} />
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{p.hectareas}</td>
                    <td className="px-3 py-3">
                      {puedeEscribir && (
                        <div className="flex gap-3">
                          <Link
                            href={`/informes/proyectos/${p.id}/editar`}
                            className="text-sm text-green-700 hover:underline dark:text-green-300"
                          >
                            Editar
                          </Link>
                          <DeleteButton action={eliminarProyectoCatalogoAction.bind(null, p.id)} />
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
            {proyectos.length === 0 ? "Todavía no hay proyectos registrados." : "Ningún proyecto coincide con la búsqueda."}
          </div>
        ) : (
          filtrados.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">{p.codigo}</p>
                  <p className="font-medium text-green-900 dark:text-green-50">{p.nombre}</p>
                </div>
                <BadgeEstado estado={p.estado} />
              </div>
              <p className="mt-1 text-sm text-green-800/80 dark:text-green-200/80">
                {p.clienteNombre} · {etiquetaTipo(p.tipoProyecto)} · {p.hectareas} ha
              </p>
              {puedeEscribir && (
                <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                  <Link
                    href={`/informes/proyectos/${p.id}/editar`}
                    className="text-sm text-green-700 hover:underline dark:text-green-300"
                  >
                    Editar
                  </Link>
                  <DeleteButton action={eliminarProyectoCatalogoAction.bind(null, p.id)} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
