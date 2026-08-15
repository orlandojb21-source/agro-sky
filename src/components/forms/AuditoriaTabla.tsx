"use client";

import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { eliminarEventoAuditoriaAction, eliminarEventosAuditoriaAction } from "@/lib/actions/auditoria";
import { formatDateTime } from "@/lib/format";

export type EventoAuditoria = {
  id: string;
  usuarioNombre: string;
  correo: string;
  seccionLabel: string;
  creadoEn: string;
};

type Filtros = {
  usuario: string;
  correo: string;
  seccion: string;
  fecha: string;
};

const FILTROS_VACIOS: Filtros = { usuario: "", correo: "", seccion: "", fecha: "" };

const inputFiltro =
  "w-36 rounded-md border border-green-200 bg-white px-2 py-1.5 text-sm text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-50";

export function AuditoriaTabla({
  eventos,
  limite,
}: {
  eventos: EventoAuditoria[];
  limite: number;
}) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const secciones = useMemo(
    () => Array.from(new Set(eventos.map((e) => e.seccionLabel))).sort((a, b) => a.localeCompare(b)),
    [eventos],
  );

  const filtrados = useMemo(() => {
    return eventos.filter((e) => {
      if (filtros.usuario.trim() && !e.usuarioNombre.toLowerCase().includes(filtros.usuario.trim().toLowerCase())) {
        return false;
      }
      if (filtros.correo.trim() && !e.correo.toLowerCase().includes(filtros.correo.trim().toLowerCase())) {
        return false;
      }
      if (filtros.seccion && e.seccionLabel !== filtros.seccion) return false;
      if (filtros.fecha) {
        const fechaEvento = new Date(e.creadoEn);
        const [anio, mes, dia] = filtros.fecha.split("-").map(Number);
        if (
          fechaEvento.getFullYear() !== anio ||
          fechaEvento.getMonth() + 1 !== mes ||
          fechaEvento.getDate() !== dia
        ) {
          return false;
        }
      }
      return true;
    });
  }, [eventos, filtros]);

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "");
  const idsSeleccionados = filtrados.filter((e) => seleccionados.has(e.id)).map((e) => e.id);

  function alternar(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function alternarTodos() {
    setSeleccionados((prev) =>
      prev.size === filtrados.length ? new Set() : new Set(filtrados.map((e) => e.id)),
    );
  }

  return (
    <div>
      <PageHeader
        title="Auditoría"
        description={`Registro de actividad de escritura por usuario, más reciente primero (últimas ${limite}). Visible solo para esta cuenta.`}
        action={
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="text"
              value={filtros.usuario}
              onChange={(e) => setFiltro("usuario", e.target.value)}
              placeholder="Usuario"
              className={inputFiltro}
            />
            <input
              type="text"
              value={filtros.correo}
              onChange={(e) => setFiltro("correo", e.target.value)}
              placeholder="Correo"
              className={inputFiltro}
            />
            <select
              value={filtros.seccion}
              onChange={(e) => setFiltro("seccion", e.target.value)}
              className={inputFiltro}
            >
              <option value="">Todas las secciones</option>
              {secciones.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filtros.fecha}
              onChange={(e) => setFiltro("fecha", e.target.value)}
              className={inputFiltro}
            />
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={() => setFiltros(FILTROS_VACIOS)}
                className="text-sm text-green-700 hover:underline dark:text-green-300"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        }
      />

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-green-100 bg-white px-6 py-10 text-center text-sm text-green-700/70 dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
          {eventos.length === 0
            ? "Todavía no hay actividad registrada."
            : "Ningún evento coincide con los filtros."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-green-700/60 dark:text-green-300/60">
              {filtrados.length} de {eventos.length} eventos
            </span>
            {idsSeleccionados.length > 0 && (
              <form
                action={eliminarEventosAuditoriaAction}
                onSubmit={(e) => {
                  if (
                    !confirm(
                      `¿Eliminar ${idsSeleccionados.length} evento(s) de auditoría? Esta acción no se puede deshacer.`,
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                {idsSeleccionados.map((id) => (
                  <input key={id} type="hidden" name="id" value={id} />
                ))}
                <button
                  type="submit"
                  className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  Eliminar seleccionados ({idsSeleccionados.length})
                </button>
              </form>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-sm">
                <thead>
                  <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={seleccionados.size > 0 && seleccionados.size === filtrados.length}
                        onChange={alternarTodos}
                        aria-label="Seleccionar todos"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">Correo</th>
                    <th className="px-4 py-3 font-medium">Sección</th>
                    <th className="px-4 py-3 font-medium">Fecha y hora</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={seleccionados.has(e.id)}
                          onChange={() => alternar(e.id)}
                          aria-label={`Seleccionar evento de ${e.usuarioNombre}`}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">{e.usuarioNombre}</td>
                      <td className="px-4 py-3 align-middle">{e.correo}</td>
                      <td className="px-4 py-3 align-middle">{e.seccionLabel}</td>
                      <td className="px-4 py-3 align-middle">{formatDateTime(e.creadoEn)}</td>
                      <td className="px-4 py-3 align-middle">
                        <DeleteButton
                          action={eliminarEventoAuditoriaAction.bind(null, e.id)}
                          confirmMessage="¿Eliminar este evento de auditoría? Esta acción no se puede deshacer."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
