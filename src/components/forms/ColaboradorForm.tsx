"use client";

import { useActionState, useState } from "react";
import { crearColaboradorAction, editarColaboradorAction } from "@/lib/actions/colaboradores";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

type ValoresColaborador = {
  id?: string;
  nombre: string;
  tipo: "fijo" | "campo";
  salario: number | null;
};

export function ColaboradorForm({ valoresIniciales }: { valoresIniciales?: ValoresColaborador }) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarColaboradorAction : crearColaboradorAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);

  const tipoInicial = (state.values?.tipo as "fijo" | "campo" | undefined) ?? valoresIniciales?.tipo ?? "campo";
  const [tipoSeleccionado, setTipoSeleccionado] = useState(tipoInicial);

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    setTipoSeleccionado(tipoInicial);
  }

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}
      {state.success && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          Colaborador agregado.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Field
            label="Nombre del colaborador"
            name="nombre"
            defaultValue={state.values?.nombre ?? valoresIniciales?.nombre}
            required
          />
        </div>
        <div className="min-w-[160px]">
          <SelectField
            label="Tipo"
            name="tipo"
            defaultValue={tipoInicial}
            onChange={(e) => setTipoSeleccionado(e.target.value as "fijo" | "campo")}
            required
          >
            <option value="fijo">Fijo (salario quincenal)</option>
            <option value="campo">Campo (pago por día)</option>
          </SelectField>
        </div>
        {tipoSeleccionado === "fijo" && (
          <div className="min-w-[160px]">
            <Field
              label="Salario quincenal (USD)"
              name="salario"
              type="number"
              min={0}
              step="0.01"
              defaultValue={state.values?.salario ?? valoresIniciales?.salario ?? undefined}
              required
            />
          </div>
        )}
        <SubmitButton>{esEdicion ? "Guardar cambios" : "+ Agregar colaborador"}</SubmitButton>
        {esEdicion && (
          <LinkButton href="/planilla/colaboradores" variant="secondary">
            Cancelar
          </LinkButton>
        )}
      </div>
    </form>
  );
}
