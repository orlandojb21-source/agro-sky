"use client";

import { useActionState, useRef, useState } from "react";
import { crearPrevistoAction } from "@/lib/actions/caja";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function PrevistoForm({ fechaHoy }: { fechaHoy: string }) {
  const [state, formAction] = useActionState(crearPrevistoAction, { error: null });

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;

  // El "Entregado" normalmente es igual al "Previsto" -- solo cambia
  // cuando no hay efectivo exacto (ej: se necesitan $14 pero se entrega un
  // billete de $20). Este input copia el valor del previsto mientras el
  // usuario no haya tocado "Entregado" a mano; en cuanto lo edita, deja de
  // seguirlo. Se usa una ref en vez de estado para no pelear con el
  // remount del formulario al reenviar.
  const entregadoRef = useRef<HTMLInputElement>(null);
  const entregadoTocado = useRef(false);

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
        onChange={(e) => {
          if (!entregadoTocado.current && entregadoRef.current) {
            entregadoRef.current.value = e.target.value;
          }
        }}
      />

      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Entregado (USD)
        <input
          ref={entregadoRef}
          name="entregado"
          type="number"
          min={0}
          step="0.01"
          defaultValue={v?.entregado}
          required
          onChange={() => {
            entregadoTocado.current = true;
          }}
          className={CLASE_INPUT}
        />
        <span className="text-xs font-normal text-green-700/60 dark:text-green-300/60">
          Lo que realmente se le entrega en efectivo. Súbelo solo si no hay cambio exacto (ej.
          previsto $14, se entrega un billete de $20).
        </span>
      </label>

      <div className="flex gap-3">
        <SubmitButton>Guardar previsto</SubmitButton>
        <LinkButton href="/caja-menuda/previstos" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
