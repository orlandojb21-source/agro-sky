"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDateOnly } from "@/lib/format";

export type HistorialProyectoFila = {
  id: string;
  codigo: string;
  nombre: string;
  tipoProyecto: "ingenio_santa_rosa" | "particular";
  estado: "abierto" | "cerrado";
  creadoEn: string;
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

type Filtros = { texto: string; estado: "" | "abierto" | "cerrado" };
const FILTROS_VACIOS: Filtros = { texto: "", estado: "" };

export function HistorialProyectosTabla({ proyectos }: { proyectos: HistorialProyectoFila[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  const filtrados = useMemo(() => {
    const texto = filtros.texto.trim().toLowerCase();
    return proyectos.filter((p) => {
      if (texto && !`${p.codigo} ${p.nombre}`.toLowerCase().includes(texto)) return false;
      if (filtros.estado && p.estado !== filtros.estado) return false;
      return true;
    });
  }, [proyectos, filtros]);

  const hayFiltrosActivos = filtros.texto !== "" || filtros.estado !== "";

  if (proyectos.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-green-700/70 dark:text-green-200/70">
        Este cliente todavía no tiene ningún Proyecto registrado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filtros.texto}
          onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
          placeholder="Buscar código o nombre..."
          className="w-full max-w-sm rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
        />
        <select
          value={filtros.estado}
          onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value as Filtros["estado"] }))}
          className="rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
        >
          <option value="">Todos los estados</option>
          <option value="abierto">Abierto</option>
          <option value="cerrado">Cerrado</option>
        </select>
        {hayFiltrosActivos && (
          <button
            onClick={() => setFiltros(FILTROS_VACIOS)}
            className="text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Limpiar filtros
          </button>
        )}
        <span className="text-xs text-green-700/60 dark:text-green-300/60">
          {filtrados.length} de {proyectos.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    Ningún proyecto coincide con los filtros.
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr key={p.id} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                      <Link href={`/informes/proyectos/${p.id}`} className="hover:underline">
                        {p.codigo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{p.nombre}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {etiquetaTipo(p.tipoProyecto)}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeEstado estado={p.estado} />
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatDateOnly(p.creadoEn)}
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
