"use client";

import { useActionState, useState } from "react";
import { crearColaboradorAction } from "@/lib/actions/colaboradores";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton } from "@/components/ui/Button";

export function ColaboradorForm() {
  const [state, formAction] = useActionState(crearColaboradorAction, { error: null });

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {state.success && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          Colaborador agregado.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Field label="Nombre del colaborador" name="nombre" defaultValue={state.values?.nombre} required />
        </div>
        <div className="min-w-[160px]">
          <SelectField label="Tipo" name="tipo" defaultValue={state.values?.tipo ?? "campo"} required>
            <option value="fijo">Fijo (salario quincenal)</option>
            <option value="campo">Campo (pago por día)</option>
          </SelectField>
        </div>
        <SubmitButton>+ Agregar colaborador</SubmitButton>
      </div>
    </form>
  );
}
