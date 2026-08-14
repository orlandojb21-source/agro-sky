"use client";

import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarArqueoAction } from "@/lib/actions/caja";
import { formatMoney, formatDateOnly } from "@/lib/format";

export type ArqueoFila = {
  id: string;
  fecha: string;
  totalContado: number;
  saldoEsperado: number;
  diferencia: number;
  nota: string | null;
};

function etiquetaDiferencia(diferencia: number): string {
  if (diferencia === 0) return "(cuadra)";
  return diferencia < 0 ? "(faltante)" : "(sobrante)";
}

function claseDiferencia(diferencia: number): string {
  if (diferencia === 0) return "text-green-700 dark:text-green-400";
  return diferencia < 0 ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400";
}

type Filtros = {
  texto: string;
  fechaDesde: string;
  fechaHasta: string;
};

const FILTROS_VACIOS: Filtros = { texto: "", fechaDesde: "", fechaHasta: "" };

const inputFiltro =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function ArqueosTabla({
  arqueos,
  puedeEscribir,
}: {
  arqueos: ArqueoFila[];
  puedeEscribir: boolean;
}) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function setFiltro<K extends keyof Filtros>(campo: K, valor: string) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const filtrados = useMemo(() => {
    const texto = filtros.texto.trim().toLowerCase();
    return arqueos.filter((a) => {
      if (texto && !(a.nota ?? "").toLowerCase().includes(texto)) return false;
      if (filtros.fechaDesde && a.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && a.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [arqueos, filtros]);

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "");

  const filtrosUi = (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={filtros.texto}
        onChange={(e) => setFiltro("texto", e.target.value)}
        placeholder="Buscar en la nota..."
        className={`w-full max-w-sm ${inputFiltro}`}
      />
      <input
        type="date"
        value={filtros.fechaDesde}
        onChange={(e) => setFiltro("fechaDesde", e.target.value)}
        className={inputFiltro}
      />
      <input
        type="date"
        value={filtros.fechaHasta}
        onChange={(e) => setFiltro("fechaHasta", e.target.value)}
        className={inputFiltro}
      />
      {hayFiltrosActivos && (
        <button
          onClick={() => setFiltros(FILTROS_VACIOS)}
          className="text-sm text-green-700 hover:underline dark:text-green-300"
        >
          Limpiar filtros
        </button>
      )}
      <span className="text-xs text-green-700/60 dark:text-green-300/60">
        {filtrados.length} de {arqueos.length}
      </span>
    </div>
  );

  if (arqueos.length === 0) {
    return (
      <div className="rounded-xl border border-green-100 bg-white p-10 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
        Todavía no hay arqueos registrados.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {filtrosUi}

      {/* Vista de escritorio */}
      <div className="hidden overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm sm:block dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Total contado</th>
                <th className="px-3 py-2 font-medium">Saldo esperado</th>
                <th className="px-3 py-2 font-medium">Diferencia</th>
                <th className="px-3 py-2 font-medium">Nota</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    Ningún arqueo coincide con los filtros.
                  </td>
                </tr>
              ) : (
                filtrados.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                  >
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatDateOnly(a.fecha)}
                    </td>
                    <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                      {formatMoney(a.totalContado)}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(a.saldoEsperado)}
                    </td>
                    <td className={`px-3 py-3 font-medium ${claseDiferencia(a.diferencia)}`}>
                      {formatMoney(a.diferencia)}
                      <span className="ml-2 text-xs font-normal">
                        {etiquetaDiferencia(a.diferencia)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {a.nota ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      {puedeEscribir && <DeleteButton action={eliminarArqueoAction.bind(null, a.id)} />}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista de movil: una tarjeta por arqueo */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            Ningún arqueo coincide con los filtros.
          </div>
        ) : (
          filtrados.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-green-700/60 dark:text-green-300/60">
                    {formatDateOnly(a.fecha)}
                  </p>
                  <p className="font-medium text-green-900 dark:text-green-50">
                    {formatMoney(a.totalContado)}
                  </p>
                </div>
                <p className={`text-right text-sm font-medium ${claseDiferencia(a.diferencia)}`}>
                  {formatMoney(a.diferencia)}
                  <br />
                  <span className="text-xs font-normal">{etiquetaDiferencia(a.diferencia)}</span>
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                    Saldo esperado
                  </p>
                  <p className="text-green-900 dark:text-green-50">
                    {formatMoney(a.saldoEsperado)}
                  </p>
                </div>
                {a.nota && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
                      Nota
                    </p>
                    <p className="text-green-900 dark:text-green-50">{a.nota}</p>
                  </div>
                )}
              </div>

              {puedeEscribir && (
                <div className="mt-3 flex border-t border-green-50 pt-3 dark:border-green-900/30">
                  <DeleteButton action={eliminarArqueoAction.bind(null, a.id)} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
