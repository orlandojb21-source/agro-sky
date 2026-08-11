"use client";

import { useActionState } from "react";
import { reasignarOperadorDroneAction } from "@/lib/actions/drones";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton } from "@/components/ui/Button";

export function ReasignarOperadorForm({
  droneId,
  colaboradoresCampo,
  fechaHoy,
}: {
  droneId: string;
  colaboradoresCampo: string[];
  fechaHoy: string;
}) {
  const [state, formAction] = useActionState(reasignarOperadorDroneAction, { error: null });

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {state.success && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          Operador reasignado.
        </p>
      )}
      <input type="hidden" name="droneId" value={droneId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField label="Nuevo operador" name="operador" defaultValue="" required>
          <option value="">Selecciona...</option>
          {colaboradoresCampo.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <Field label="Fecha del cambio" name="fecha" type="date" defaultValue={fechaHoy} required />
      </div>
      <div>
        <SubmitButton>Reasignar operador</SubmitButton>
      </div>
    </form>
  );
}
