"use client";

import { useActionState, useState } from "react";
import { crearServicioAction, actualizarServicioAction } from "@/lib/actions/servicios";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

type ValoresServicio = {
  id?: string;
  nombre: string;
  descripcion: string | null;
  costo: number | null;
  precio: number | null;
};

export function ServicioForm({ valoresIniciales }: { valoresIniciales?: ValoresServicio }) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? actualizarServicioAction : crearServicioAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      <Field
        label="Nombre"
        name="nombre"
        defaultValue={v?.nombre ?? valoresIniciales?.nombre ?? undefined}
        required
      />

      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Descripción
        <textarea
          name="descripcion"
          rows={3}
          defaultValue={v?.descripcion ?? valoresIniciales?.descripcion ?? undefined}
          placeholder="Detalle del servicio (se podrá ajustar en cada venta)"
          className={CLASE_INPUT}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Costo referencial (USD)"
          name="costo"
          type="number"
          min={0}
          step="0.01"
          defaultValue={v?.costo ?? valoresIniciales?.costo ?? undefined}
        />
        <Field
          label="Precio referencial (USD)"
          name="precio"
          type="number"
          min={0}
          step="0.01"
          defaultValue={v?.precio ?? valoresIniciales?.precio ?? undefined}
        />
      </div>
      <p className="-mt-2 text-xs text-green-700/60 dark:text-green-300/60">
        Costo y precio son solo una referencia: se podrán editar en cada venta, ya que no todos
        los servicios cuestan ni se describen igual cada vez.
      </p>

      <div className="flex gap-3">
        <SubmitButton>Guardar</SubmitButton>
        <LinkButton href="/inventario/servicios" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
