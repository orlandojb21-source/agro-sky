"use client";

import { useActionState, useState } from "react";
import {
  crearProductoAction,
  actualizarProductoAction,
} from "@/lib/actions/productos";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import type { TipoProducto } from "@/lib/inventario-tipo";

type ValoresProducto = {
  id?: string;
  numeroParte: string;
  descripcion: string;
  cantidad: number;
  costo: number;
  venta: number;
  rack: string | null;
  contenedor: string | null;
  unidad: string | null;
};

export function ProductoForm({
  tipo,
  seccionHref,
  valoresIniciales,
}: {
  tipo: TipoProducto;
  seccionHref: string;
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
  const rack = v?.rack ?? valoresIniciales?.rack ?? "";
  const contenedor = v?.contenedor ?? valoresIniciales?.contenedor ?? "";
  const unidad = v?.unidad ?? valoresIniciales?.unidad ?? "";

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
          label="Rack"
          name="rack"
          defaultValue={rack}
          placeholder="Ej: 2"
        />
        <Field
          label="Contenedor"
          name="contenedor"
          defaultValue={contenedor}
          placeholder="Ej: 22"
        />
        <Field
          label="Unidad"
          name="unidad"
          defaultValue={unidad}
          placeholder="Ej: unidad, caja, kg"
        />
      </div>

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

      <div className="flex gap-3">
        <SubmitButton>Guardar</SubmitButton>
        <LinkButton href={seccionHref} variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
