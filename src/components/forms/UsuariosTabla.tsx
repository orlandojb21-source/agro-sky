"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarUsuarioAction, type UsuarioConEmail } from "@/lib/actions/usuarios";
import { ROL_LABEL, ROLES, type Rol } from "@/lib/roles";
import { formatDate } from "@/lib/format";

type Filtros = {
  texto: string;
  rol: "" | Rol;
};

const FILTROS_VACIOS: Filtros = { texto: "", rol: "" };

const inputFiltro =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function UsuariosTabla({
  usuarios,
  puedeEscribir,
  perfilActualId,
}: {
  usuarios: UsuarioConEmail[];
  puedeEscribir: boolean;
  perfilActualId: string;
}) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    const texto = filtros.texto.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (
        texto &&
        !`${u.nombreCompleto} ${u.email} ${u.telefono ?? ""}`.toLowerCase().includes(texto)
      )
        return false;
      if (filtros.rol && u.rol !== filtros.rol) return false;
      return true;
    });
  }, [usuarios, filtros]);

  const hayFiltrosActivos = filtros.texto !== "" || filtros.rol !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filtros.texto}
          onChange={(e) => setFiltro("texto", e.target.value)}
          placeholder="Buscar nombre, correo o teléfono..."
          className={`w-full max-w-sm ${inputFiltro}`}
        />
        <select
          value={filtros.rol}
          onChange={(e) => setFiltro("rol", e.target.value as Filtros["rol"])}
          className={inputFiltro}
        >
          <option value="">Todos los roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROL_LABEL[r]}
            </option>
          ))}
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
          {filtrados.length} de {usuarios.length}
        </span>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Correo</th>
                <th className="px-4 py-2 font-medium">Teléfono</th>
                <th className="px-4 py-2 font-medium">Rol</th>
                <th className="px-4 py-2 font-medium">Desde</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    {usuarios.length === 0 ? "Todavía no hay usuarios." : "Ningún usuario coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">{u.nombreCompleto}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{u.email}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{u.telefono ?? "—"}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{ROL_LABEL[u.rol]}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{formatDate(u.creadoEn)}</td>
                    <td className="px-4 py-3">
                      {puedeEscribir && (
                        <div className="flex gap-3">
                          <Link
                            href={`/usuarios/${u.id}/editar`}
                            className="text-sm text-green-700 hover:underline dark:text-green-300"
                          >
                            Editar
                          </Link>
                          {u.id !== perfilActualId && (
                            <DeleteButton
                              action={eliminarUsuarioAction.bind(null, u.id)}
                              confirmMessage={`¿Eliminar la cuenta de ${u.nombreCompleto}? Esta acción no se puede deshacer.`}
                            />
                          )}
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
            {usuarios.length === 0 ? "Todavía no hay usuarios." : "Ningún usuario coincide con los filtros."}
          </div>
        ) : (
          filtrados.map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <p className="font-medium text-green-900 dark:text-green-50">{u.nombreCompleto}</p>
              <p className="mt-1 text-sm text-green-800/80 dark:text-green-200/80">
                {u.email} · {ROL_LABEL[u.rol]}
              </p>
              {puedeEscribir && (
                <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                  <Link
                    href={`/usuarios/${u.id}/editar`}
                    className="text-sm text-green-700 hover:underline dark:text-green-300"
                  >
                    Editar
                  </Link>
                  {u.id !== perfilActualId && (
                    <DeleteButton
                      action={eliminarUsuarioAction.bind(null, u.id)}
                      confirmMessage={`¿Eliminar la cuenta de ${u.nombreCompleto}? Esta acción no se puede deshacer.`}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
