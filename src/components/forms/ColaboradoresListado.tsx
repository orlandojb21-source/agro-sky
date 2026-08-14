"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarColaboradorAction } from "@/lib/actions/colaboradores";

export type ColaboradorFila = {
  id: string;
  nombre: string;
  salario: number | null;
  aplicaDeducciones: boolean;
  fotoUrl: string | null;
};

function ListaColaboradores({
  titulo,
  colaboradores,
  puedeEscribir,
}: {
  titulo: string;
  colaboradores: ColaboradorFila[];
  puedeEscribir: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
        {titulo}
      </h2>
      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        {colaboradores.length === 0 ? (
          <p className="px-6 py-6 text-center text-sm text-green-700/70 dark:text-green-200/70">
            Ningún colaborador coincide.
          </p>
        ) : (
          <ul className="divide-y divide-green-50 dark:divide-green-900/30">
            {colaboradores.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {c.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.fotoUrl}
                      alt={c.nombre}
                      className="h-9 w-9 rounded-full border border-green-200 object-cover dark:border-green-800"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {c.nombre.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="font-medium text-green-900 dark:text-green-50">{c.nombre}</span>
                </div>
                {puedeEscribir && (
                  <div className="flex gap-3">
                    <Link
                      href={`/planilla/colaboradores/${c.id}/editar`}
                      className="text-sm text-green-700 hover:underline dark:text-green-300"
                    >
                      Editar
                    </Link>
                    <DeleteButton
                      action={eliminarColaboradorAction.bind(null, c.id)}
                      confirmMessage={`¿Eliminar a ${c.nombre}? Los pagos ya registrados a su nombre no se ven afectados, pero dejará de aparecer para registrar pagos nuevos.`}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ColaboradoresListado({
  fijos,
  campo,
  puedeEscribir,
}: {
  fijos: ColaboradorFila[];
  campo: ColaboradorFila[];
  puedeEscribir: boolean;
}) {
  const [texto, setTexto] = useState("");

  const { fijosFiltrados, campoFiltrados } = useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return { fijosFiltrados: fijos, campoFiltrados: campo };
    return {
      fijosFiltrados: fijos.filter((c) => c.nombre.toLowerCase().includes(t)),
      campoFiltrados: campo.filter((c) => c.nombre.toLowerCase().includes(t)),
    };
  }, [fijos, campo, texto]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar colaborador..."
        className="w-full max-w-sm rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ListaColaboradores titulo="Fijos (salario mensual)" colaboradores={fijosFiltrados} puedeEscribir={puedeEscribir} />
        <ListaColaboradores
          titulo="Campo (asistencia diaria, pago quincenal)"
          colaboradores={campoFiltrados}
          puedeEscribir={puedeEscribir}
        />
      </div>
    </div>
  );
}
