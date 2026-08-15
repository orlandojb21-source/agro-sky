"use client";

import { useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarEventoAuditoriaAction, eliminarEventosAuditoriaAction } from "@/lib/actions/auditoria";
import { formatDateTime } from "@/lib/format";

export type EventoAuditoria = {
  id: string;
  usuarioNombre: string;
  correo: string;
  seccionLabel: string;
  creadoEn: string;
};

export function AuditoriaTabla({ eventos }: { eventos: EventoAuditoria[] }) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  function alternar(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function alternarTodos() {
    setSeleccionados((prev) => (prev.size === eventos.length ? new Set() : new Set(eventos.map((e) => e.id))));
  }

  if (eventos.length === 0) {
    return (
      <p className="rounded-xl border border-green-100 bg-white px-6 py-10 text-center text-sm text-green-700/70 dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
        Todavía no hay actividad registrada.
      </p>
    );
  }

  const idsSeleccionados = eventos.filter((e) => seleccionados.has(e.id)).map((e) => e.id);

  return (
    <div className="flex flex-col gap-3">
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

      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.size > 0 && seleccionados.size === eventos.length}
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
              {eventos.map((e) => (
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
  );
}
