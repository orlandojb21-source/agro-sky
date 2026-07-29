"use client";

import { marcarVentaCobradaAction } from "@/lib/actions/ventas";

export function MarcarCobradaButton({
  id,
  label = "Marcar como cobrada",
  className = "rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90",
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  return (
    <form
      action={marcarVentaCobradaAction.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm("¿Marcar esta factura como cobrada?")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
