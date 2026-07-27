"use client";

import { confirmarRecepcionAction } from "@/lib/actions/compras";

export function BotonConfirmarRecepcion({ id }: { id: string }) {
  return (
    <form
      action={confirmarRecepcionAction.bind(null, id)}
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Confirmar la recepción de esta orden? Esto suma automáticamente las cantidades al inventario y no se puede deshacer.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
      >
        Confirmar recepción
      </button>
    </form>
  );
}
