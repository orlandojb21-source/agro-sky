"use client";

import { useActionState, useState } from "react";
import { crearReposicionAction } from "@/lib/actions/caja";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReposicionForm() {
  const [state, formAction] = useActionState(crearReposicionAction, { error: null });

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
        defaultValue={v?.fecha ?? hoyISO()}
        required
      />
      <Field
        label="Monto repuesto (USD)"
        name="monto"
        type="number"
        min={0}
        step="0.01"
        defaultValue={v?.monto}
        required
      />
      <Field
        label="Nota (opcional)"
        name="nota"
        defaultValue={v?.nota}
        placeholder="Ej: Reposición mensual, devolución de sobrante..."
      />

      <div className="flex gap-3">
        <SubmitButton>Guardar reposición</SubmitButton>
        <LinkButton href="/caja-menuda" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
