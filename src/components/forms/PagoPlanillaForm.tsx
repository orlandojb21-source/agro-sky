"use client";

import { useActionState, useState } from "react";
import { crearPagoAction, editarPagoAction } from "@/lib/actions/planilla";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

type ValoresPago = {
  id?: string;
  colaborador: string;
  fecha: string;
  descripcion: string;
  monto: number;
};

export function PagoPlanillaForm({
  fechaHoy,
  colaboradores,
  valoresIniciales,
}: {
  fechaHoy: string;
  colaboradores: string[];
  valoresIniciales?: ValoresPago;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarPagoAction : crearPagoAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;

  // Si se edita un pago de un colaborador que ya se eliminó de la lista
  // administrable, se agrega igual como opción para no cambiarle el
  // colaborador sin querer al abrir el formulario.
  const opciones =
    valoresIniciales?.colaborador && !colaboradores.includes(valoresIniciales.colaborador)
      ? [valoresIniciales.colaborador, ...colaboradores]
      : colaboradores;

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      {opciones.length === 0 ? (
        <p className="text-sm text-green-700/70 dark:text-green-300/70">
          Todavía no hay colaboradores registrados.{" "}
          <LinkButton href="/planilla/colaboradores" variant="secondary">
            Agregar colaborador
          </LinkButton>
        </p>
      ) : (
        <SelectField
          label="Colaborador"
          name="colaborador"
          defaultValue={v?.colaborador ?? valoresIniciales?.colaborador ?? opciones[0]}
          required
        >
          {opciones.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
      )}

      <Field
        label="Fecha"
        name="fecha"
        type="date"
        defaultValue={v?.fecha ?? valoresIniciales?.fecha ?? fechaHoy}
        required
      />

      <Field
        label="Descripción"
        name="descripcion"
        defaultValue={v?.descripcion ?? valoresIniciales?.descripcion ?? undefined}
        placeholder="Ej: Día completo, proyecto Finca La Loma"
        required
      />

      <Field
        label="Monto pagado (USD)"
        name="monto"
        type="number"
        min={0}
        step="0.01"
        defaultValue={v?.monto ?? valoresIniciales?.monto ?? undefined}
        required
      />

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "Guardar pago"}</SubmitButton>
        <LinkButton href="/planilla" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
