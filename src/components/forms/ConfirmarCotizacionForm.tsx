"use client";

import { useState } from "react";
import { confirmarCotizacionAction } from "@/lib/actions/cotizaciones";
import { Field, SelectField } from "@/components/ui/Field";

export function ConfirmarCotizacionForm({ id }: { id: string }) {
  const [estadoPago, setEstadoPago] = useState<"pagada" | "pendiente">("pagada");
  const [fechaVencimiento, setFechaVencimiento] = useState("");

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
      className="flex flex-wrap items-end gap-3"
    >
      <SelectField
        label="Estado de pago"
        name="estadoPago"
        defaultValue={estadoPago}
        onChange={(e) => setEstadoPago(e.target.value as "pagada" | "pendiente")}
      >
        <option value="pagada">Pagada</option>
        <option value="pendiente">Por cobrar</option>
      </SelectField>
      {estadoPago === "pendiente" && (
        <Field
          label="Fecha de vencimiento"
          name="fechaVencimiento"
          type="date"
          value={fechaVencimiento}
          onChange={(e) => setFechaVencimiento(e.target.value)}
          required
        />
      )}
      <button
        type="submit"
        className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
      >
        Confirmar venta
      </button>
    </form>
  );
}
