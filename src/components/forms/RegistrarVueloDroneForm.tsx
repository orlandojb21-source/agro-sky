"use client";

import { useActionState } from "react";
import { registrarVueloDroneAction } from "@/lib/actions/dronesVuelos";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton } from "@/components/ui/Button";

export function RegistrarVueloDroneForm({
  droneId,
  colaboradoresCampo,
  operadorSugerido,
  fechaHoy,
}: {
  droneId: string;
  colaboradoresCampo: string[];
  operadorSugerido: string | null;
  fechaHoy: string;
}) {
  const [state, formAction] = useActionState(registrarVueloDroneAction, { error: null });

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {state.success && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          Vuelo registrado -- los totales del drone ya se actualizaron.
        </p>
      )}
      <input type="hidden" name="droneId" value={droneId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField label="Operador" name="operador" defaultValue={operadorSugerido ?? ""} required>
          <option value="">Selecciona...</option>
          {colaboradoresCampo.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <Field label="Fecha" name="fecha" type="date" defaultValue={fechaHoy} required />
      </div>
      <p className="text-xs text-green-700/60 dark:text-green-300/60">
        Carga lo que sumó ESTE trabajo (no el total nuevo del drone) -- se suma solo a los totales.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Horas de Vuelo" name="horasVuelo" type="number" min={0} step="0.01" required />
        <Field label="Área Cubierta (ha)" name="areaCubierta" type="number" min={0} step="0.01" required />
        <Field label="Vuelos" name="vuelos" type="number" min={0} step="1" required />
      </div>
      <div>
        <SubmitButton>Registrar vuelo</SubmitButton>
      </div>
    </form>
  );
}
