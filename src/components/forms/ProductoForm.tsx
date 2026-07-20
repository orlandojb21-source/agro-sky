"use client";

import { useActionState, useState } from "react";
import {
  crearProductoAction,
  actualizarProductoAction,
} from "@/lib/actions/productos";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import type { TipoProducto } from "@/lib/inventario-tipo";
import type { RackConContenedores } from "@/lib/data/racks";

type ValoresProducto = {
  id?: string;
  numeroParte: string;
  descripcion: string;
  cantidad: number;
  costo: number;
  venta: number;
  contenedorId: string | null;
};

export function ProductoForm({
  tipo,
  seccionHref,
  racks,
  valoresIniciales,
}: {
  tipo: TipoProducto;
  seccionHref: string;
  racks: RackConContenedores[];
  valoresIniciales?: ValoresProducto;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? actualizarProductoAction : crearProductoAction,
    { error: null },
  );

  // Si la accion falla (ej: numero de parte duplicado), React limpia el
  // formulario al terminar la Server Action. Para no obligar al usuario a
  // reescribir todo, reusamos lo que envio (state.values) como valor inicial,
  // y forzamos que el formulario se vuelva a montar (remountKey) para que
  // los inputs no controlados tomen ese nuevo defaultValue: cada objeto que
  // devuelve la Server Action es una referencia nueva, asi que este patron
  // (ajustar estado durante el render) detecta cada intento, incluso si dos
  // envios seguidos fallan con el mismo mensaje de error.
  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;
  const numeroParte = v?.numeroParte ?? valoresIniciales?.numeroParte;
  const descripcion = v?.descripcion ?? valoresIniciales?.descripcion;
  const cantidad = v?.cantidad ?? valoresIniciales?.cantidad ?? 0;
  const costo = v?.costo ?? valoresIniciales?.costo ?? 0;
  const venta = v?.venta ?? valoresIniciales?.venta ?? 0;
  const contenedorId = v?.contenedorId ?? valoresIniciales?.contenedorId ?? "";

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      <input type="hidden" name="tipo" value={tipo} />
      {esEdicion && (
        <input type="hidden" name="id" value={valoresIniciales!.id} />
      )}

      <Field
        label="Número de parte"
        name="numeroParte"
        defaultValue={numeroParte}
        required
      />
      <Field
        label="Descripción"
        name="descripcion"
        defaultValue={descripcion}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="Cantidad"
          name="cantidad"
          type="number"
          min={0}
          defaultValue={cantidad}
          required
        />
        <Field
          label="Costo (USD)"
          name="costo"
          type="number"
          min={0}
          step="0.01"
          defaultValue={costo}
          required
        />
        <Field
          label="Venta (USD)"
          name="venta"
          type="number"
          min={0}
          step="0.01"
          defaultValue={venta}
          required
        />
      </div>

      <SelectField
        label="Ubicación (rack / contenedor)"
        name="contenedorId"
        defaultValue={contenedorId}
      >
        <option value="">Sin asignar</option>
        {racks.map((rack) => (
          <optgroup key={rack.id} label={rack.nombre}>
            {rack.contenedores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </optgroup>
        ))}
      </SelectField>

      <div className="flex gap-3">
        <SubmitButton>Guardar</SubmitButton>
        <LinkButton href={seccionHref} variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
