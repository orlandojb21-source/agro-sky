"use client";

import { rechazarSolicitudAction } from "@/lib/actions/compras";

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function FormularioRechazarSolicitud({ id }: { id: string }) {
  return (
    <form
      action={rechazarSolicitudAction.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm("¿Rechazar esta solicitud de compra? Esta acción no se puede deshacer.")) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-3 rounded-xl border border-red-100 bg-white p-6 shadow-sm dark:border-red-900/40 dark:bg-red-950/10"
    >
      <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Rechazar solicitud</h2>
      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Motivo (opcional)
        <textarea name="motivo" rows={2} className={CLASE_INPUT} />
      </label>
      <button
        type="submit"
        className="self-start rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
      >
        Rechazar solicitud
      </button>
    </form>
  );
}
