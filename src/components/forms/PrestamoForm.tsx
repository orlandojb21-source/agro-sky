"use client";

import { useActionState } from "react";
import { crearPrestamoAction, editarPrestamoAction } from "@/lib/actions/prestamos";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

type ValoresPrestamo = {
  id?: string;
  colaborador: string;
  fecha: string;
  monto: number;
  cuotaQuincenal: number;
  nota: string | null;
};

export function PrestamoForm({
  colaboradores,
  fechaHoy,
  valoresIniciales,
}: {
  colaboradores: string[];
  fechaHoy: string;
  valoresIniciales?: ValoresPrestamo;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarPrestamoAction : crearPrestamoAction,
    { error: null },
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Colaborador"
          name="colaborador"
          defaultValue={state.values?.colaborador ?? valoresIniciales?.colaborador ?? colaboradores[0] ?? ""}
          required
        >
          {colaboradores.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <Field
          label="Fecha"
          name="fecha"
          type="date"
          defaultValue={state.values?.fecha ?? valoresIniciales?.fecha ?? fechaHoy}
          required
        />
        <Field
          label="Monto prestado (USD)"
          name="monto"
          type="number"
          min={0}
          step="0.01"
          defaultValue={state.values?.monto ?? valoresIniciales?.monto ?? undefined}
          required
        />
        <Field
          label="Cuota sugerida por quincena (USD)"
          name="cuotaQuincenal"
          type="number"
          min={0}
          step="0.01"
          defaultValue={state.values?.cuotaQuincenal ?? valoresIniciales?.cuotaQuincenal ?? undefined}
          required
        />
      </div>

      <Field
        label="Nota"
        name="nota"
        defaultValue={state.values?.nota ?? valoresIniciales?.nota ?? undefined}
        placeholder="Opcional"
      />

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "+ Registrar préstamo"}</SubmitButton>
        {esEdicion && (
          <LinkButton href="/planilla/prestamos" variant="secondary">
            Cancelar
          </LinkButton>
        )}
      </div>
    </form>
  );
}
