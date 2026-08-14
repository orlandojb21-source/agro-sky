"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ImagenAmpliable } from "@/components/ui/ImagenAmpliable";
import {
  eliminarMantenimientoPreventivoAction,
  eliminarMantenimientoCorrectivoAction,
} from "@/lib/actions/dronesMantenimiento";
import { formatDateOnly } from "@/lib/format";

export type EstadoPreventivoFila = {
  id: string;
  droneId: string;
  droneNombre: string;
  tipo: string;
  fecha: string;
  intervaloHoras: number | null;
  intervaloHectareas: number | null;
  intervaloVuelos: number | null;
  intervaloMeses: number | null;
  vencido: boolean;
};

export type CorrectivoFila = {
  id: string;
  fecha: string;
  droneNombre: string;
  motivo: string;
  piezas: string;
  imagenUrls: string[];
};

function descripcionIntervalo(f: EstadoPreventivoFila): string {
  const partes: string[] = [];
  if (f.intervaloHoras) partes.push(`cada ${f.intervaloHoras} hrs`);
  if (f.intervaloHectareas) partes.push(`cada ${f.intervaloHectareas} ha`);
  if (f.intervaloVuelos) partes.push(`cada ${f.intervaloVuelos} vuelos`);
  if (f.intervaloMeses) partes.push(`cada ${f.intervaloMeses} meses`);
  return partes.join(" · ");
}

const inputFiltro =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

type FiltrosPreventivo = { texto: string; estado: "" | "vencido" | "al_dia" };
const FILTROS_PREVENTIVO_VACIOS: FiltrosPreventivo = { texto: "", estado: "" };

type FiltrosCorrectivo = { texto: string; fechaDesde: string; fechaHasta: string };
const FILTROS_CORRECTIVO_VACIOS: FiltrosCorrectivo = { texto: "", fechaDesde: "", fechaHasta: "" };

export function TablaPreventivo({
  estado,
  puedeEliminar,
}: {
  estado: EstadoPreventivoFila[];
  puedeEliminar: boolean;
}) {
  const [filtros, setFiltros] = useState<FiltrosPreventivo>(FILTROS_PREVENTIVO_VACIOS);

  const filtrados = useMemo(() => {
    const texto = filtros.texto.trim().toLowerCase();
    return estado.filter((f) => {
      if (texto && !`${f.droneNombre} ${f.tipo}`.toLowerCase().includes(texto)) return false;
      if (filtros.estado === "vencido" && !f.vencido) return false;
      if (filtros.estado === "al_dia" && f.vencido) return false;
      return true;
    });
  }, [estado, filtros]);

  const hayFiltrosActivos = filtros.texto !== "" || filtros.estado !== "";

  const columnas: Column<EstadoPreventivoFila>[] = [
    { header: "Drone", render: (f) => <Link href={`/bitacora/${f.droneId}`} className="hover:underline">{f.droneNombre}</Link> },
    { header: "Tipo", render: (f) => f.tipo },
    { header: "Último", render: (f) => formatDateOnly(f.fecha) },
    { header: "Intervalo", render: (f) => descripcionIntervalo(f) },
    {
      header: "Estado",
      render: (f) =>
        f.vencido ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
            Vencido
          </span>
        ) : (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Al día
          </span>
        ),
    },
    ...(puedeEliminar
      ? [
          {
            header: "",
            render: (f: EstadoPreventivoFila) => (
              <DeleteButton
                action={eliminarMantenimientoPreventivoAction.bind(null, f.id)}
                confirmMessage="¿Eliminar este mantenimiento preventivo? Esta acción no se puede deshacer."
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filtros.texto}
          onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
          placeholder="Buscar drone o tipo..."
          className={`w-full max-w-sm ${inputFiltro}`}
        />
        <select
          value={filtros.estado}
          onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value as FiltrosPreventivo["estado"] }))}
          className={inputFiltro}
        >
          <option value="">Todos los estados</option>
          <option value="vencido">Vencido</option>
          <option value="al_dia">Al día</option>
        </select>
        {hayFiltrosActivos && (
          <button
            onClick={() => setFiltros(FILTROS_PREVENTIVO_VACIOS)}
            className="text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Limpiar filtros
          </button>
        )}
        <span className="text-xs text-green-700/60 dark:text-green-300/60">
          {filtrados.length} de {estado.length}
        </span>
      </div>
      <DataTable
        rows={filtrados}
        columns={columnas}
        emptyMessage={
          estado.length === 0
            ? "Todavía no hay mantenimientos preventivos registrados."
            : "Ningún mantenimiento coincide con los filtros."
        }
      />
    </div>
  );
}

export function TablaCorrectivo({
  correctivos,
  puedeEliminar,
}: {
  correctivos: CorrectivoFila[];
  puedeEliminar: boolean;
}) {
  const [filtros, setFiltros] = useState<FiltrosCorrectivo>(FILTROS_CORRECTIVO_VACIOS);

  const filtrados = useMemo(() => {
    const texto = filtros.texto.trim().toLowerCase();
    return correctivos.filter((c) => {
      if (texto && !`${c.droneNombre} ${c.motivo} ${c.piezas}`.toLowerCase().includes(texto)) return false;
      if (filtros.fechaDesde && c.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && c.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [correctivos, filtros]);

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "");

  const columnas: Column<CorrectivoFila>[] = [
    { header: "Fecha", render: (c) => formatDateOnly(c.fecha) },
    { header: "Drone", render: (c) => c.droneNombre },
    { header: "Motivo", render: (c) => c.motivo },
    { header: "Piezas cambiadas", render: (c) => c.piezas || "—" },
    {
      header: "Imágenes",
      render: (c) =>
        c.imagenUrls.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {c.imagenUrls.map((url, i) => (
              <ImagenAmpliable
                key={url}
                src={url}
                alt={`Pieza cambiada ${i + 1} — ${c.motivo}`}
                className="h-12 w-12 rounded-md border border-green-200 object-cover dark:border-green-800"
              />
            ))}
          </div>
        ) : (
          "—"
        ),
    },
    ...(puedeEliminar
      ? [
          {
            header: "",
            render: (c: CorrectivoFila) => (
              <DeleteButton
                action={eliminarMantenimientoCorrectivoAction.bind(null, c.id)}
                confirmMessage="¿Eliminar este mantenimiento correctivo? Las piezas cambiadas vuelven a sumarse al stock de Inventario. Esta acción no se puede deshacer."
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filtros.texto}
          onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
          placeholder="Buscar drone, motivo o pieza..."
          className={`w-full max-w-sm ${inputFiltro}`}
        />
        <input
          type="date"
          value={filtros.fechaDesde}
          onChange={(e) => setFiltros((f) => ({ ...f, fechaDesde: e.target.value }))}
          className={inputFiltro}
        />
        <input
          type="date"
          value={filtros.fechaHasta}
          onChange={(e) => setFiltros((f) => ({ ...f, fechaHasta: e.target.value }))}
          className={inputFiltro}
        />
        {hayFiltrosActivos && (
          <button
            onClick={() => setFiltros(FILTROS_CORRECTIVO_VACIOS)}
            className="text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Limpiar filtros
          </button>
        )}
        <span className="text-xs text-green-700/60 dark:text-green-300/60">
          {filtrados.length} de {correctivos.length}
        </span>
      </div>
      <DataTable
        rows={filtrados}
        columns={columnas}
        emptyMessage={
          correctivos.length === 0
            ? "Todavía no hay mantenimientos correctivos registrados."
            : "Ningún mantenimiento coincide con los filtros."
        }
      />
    </div>
  );
}
