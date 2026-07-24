"use client";

import { confirmarCotizacionAction } from "@/lib/actions/cotizaciones";

export function BotonConfirmarCotizacion({
  id,
  label = "Confirmar",
  className = "text-sm text-green-700 hover:underline dark:text-green-300",
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  return (
    <form
      action={confirmarCotizacionAction.bind(null, id)}
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Confirmar esta cotización como venta? Esto descuenta el stock de los productos vendidos.",
          )
        ) {
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
