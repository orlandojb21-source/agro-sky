"use client";

import { useActionState, useState } from "react";
import { crearPrevistoAction } from "@/lib/actions/caja";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

export function PrevistoForm({ fechaHoy }: { fechaHoy: string }) {
  const [state, formAction] = useActionState(crearPrevistoAction, { error: null });

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
        label="Colaborador"
        name="colaborador"
        defaultValue={v?.colaborador}
        placeholder="Ej: Juan Pérez"
        required
      />
      <Field
        label="Previsto del día (USD)"
        name="monto"
        type="number"
        min={0}
        step="0.01"
        defaultValue={v?.monto}
        required
      />

      <div className="flex gap-3">
        <SubmitButton>Guardar previsto</SubmitButton>
        <LinkButton href="/caja-menuda/previstos" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
