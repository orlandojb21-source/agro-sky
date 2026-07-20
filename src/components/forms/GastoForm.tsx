"use client";

import { useActionState, useState } from "react";
import { crearGastoAction } from "@/lib/actions/caja";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

const CONCEPTOS_SUGERIDOS = ["Transporte", "Comida", "Combustible", "Hospedaje", "Materiales", "Otro"];

export function GastoForm({ fechaHoy }: { fechaHoy: string }) {
  const [state, formAction] = useActionState(crearGastoAction, { error: null });

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

      <Field
        label="Fecha"
        name="fecha"
        type="date"
        defaultValue={v?.fecha ?? fechaHoy}
        required
      />
      <Field
        label="Nombre (a quién se le entregó el dinero)"
        name="nombre"
        defaultValue={v?.nombre}
        required
      />

      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Concepto
        <input
          name="concepto"
          type="text"
          list="conceptos-sugeridos"
          defaultValue={v?.concepto}
          required
          placeholder="Ej: Transporte"
          className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
        />
        <datalist id="conceptos-sugeridos">
          {CONCEPTOS_SUGERIDOS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <Field
        label="Monto (USD)"
        name="monto"
        type="number"
        min={0}
        step="0.01"
        defaultValue={v?.monto}
        required
      />
      <Field
        label="Colaborador (opcional, si es parte del previsto diario de alguien)"
        name="colaborador"
        defaultValue={v?.colaborador}
        placeholder="Ej: Juan Pérez"
      />
      <Field
        label="Nota (opcional)"
        name="nota"
        defaultValue={v?.nota}
      />

      <div className="flex gap-3">
        <SubmitButton>Guardar gasto</SubmitButton>
        <LinkButton href="/caja-menuda" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
