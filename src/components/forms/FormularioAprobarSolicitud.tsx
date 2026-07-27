"use client";

import { aprobarSolicitudAction } from "@/lib/actions/compras";

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function FormularioAprobarSolicitud({ id }: { id: string }) {
  return (
    <form
      action={aprobarSolicitudAction.bind(null, id)}
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Aprobar esta solicitud? Se creará una Orden de Compra real para enviar al proveedor.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">
        Aprobar y crear orden de compra
      </h2>
      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Nombre del proveedor
        <input name="proveedorNombre" required className={CLASE_INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Contacto del proveedor (opcional)
        <input name="proveedorContacto" className={CLASE_INPUT} />
      </label>
      <button
        type="submit"
        className="self-start rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
      >
        Aprobar solicitud
      </button>
    </form>
  );
}
