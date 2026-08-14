"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarProveedorAction } from "@/lib/actions/proveedores";

export type ProveedorFila = {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
};

export function ProveedoresTabla({
  proveedores,
  puedeEscribir,
}: {
  proveedores: ProveedorFila[];
  puedeEscribir: boolean;
}) {
  const [texto, setTexto] = useState("");

  const filtrados = useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return proveedores;
    return proveedores.filter((p) =>
      [p.nombre, p.contacto, p.telefono, p.correo].filter(Boolean).join(" ").toLowerCase().includes(t),
    );
  }, [proveedores, texto]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar proveedor..."
        className="w-full max-w-sm rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
      />

      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Contacto</th>
                <th className="px-4 py-2 font-medium">Teléfono</th>
                <th className="px-4 py-2 font-medium">Correo</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    {proveedores.length === 0
                      ? "Todavía no hay proveedores registrados."
                      : "Ningún proveedor coincide con la búsqueda."}
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">{p.nombre}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{p.contacto ?? "—"}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{p.telefono ?? "—"}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{p.correo ?? "—"}</td>
                    <td className="px-4 py-3">
                      {puedeEscribir && (
                        <div className="flex gap-3">
                          <Link
                            href={`/compras/proveedores/${p.id}/editar`}
                            className="text-sm text-green-700 hover:underline dark:text-green-300"
                          >
                            Editar
                          </Link>
                          <DeleteButton
                            action={eliminarProveedorAction.bind(null, p.id)}
                            confirmMessage={`¿Eliminar a ${p.nombre}? Los gastos ya registrados con este proveedor no se ven afectados.`}
                          />
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
            {proveedores.length === 0
              ? "Todavía no hay proveedores registrados."
              : "Ningún proveedor coincide con la búsqueda."}
          </div>
        ) : (
          filtrados.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <p className="font-medium text-green-900 dark:text-green-50">{p.nombre}</p>
              <p className="mt-1 text-sm text-green-800/80 dark:text-green-200/80">
                {p.contacto ?? "Sin contacto"} {p.telefono ? `· ${p.telefono}` : ""}
              </p>
              {puedeEscribir && (
                <div className="mt-3 flex gap-4 border-t border-green-50 pt-3 dark:border-green-900/30">
                  <Link
                    href={`/compras/proveedores/${p.id}/editar`}
                    className="text-sm text-green-700 hover:underline dark:text-green-300"
                  >
                    Editar
                  </Link>
                  <DeleteButton
                    action={eliminarProveedorAction.bind(null, p.id)}
                    confirmMessage={`¿Eliminar a ${p.nombre}? Los gastos ya registrados con este proveedor no se ven afectados.`}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
