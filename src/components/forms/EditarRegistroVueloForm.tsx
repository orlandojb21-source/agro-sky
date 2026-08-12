"use client";

import { useActionState } from "react";
import { editarRegistroVueloAction } from "@/lib/actions/dronesVuelos";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

type ValoresRegistroVuelo = {
  id: string;
  droneNombre: string;
  droneModelo: string;
  fecha: string;
  operador: string;
  horasVuelo: number;
  areaCubierta: number;
  vuelos: number;
};

// No permite cambiar de drone (ver comentario en validation/dronesVuelos.ts)
// -- el resto de los campos sí, y al guardar se recalcula toda la cadena
// de lecturas de ese drone (editarRegistroVueloAction).
export function EditarRegistroVueloForm({
  colaboradoresCampo,
  valoresIniciales,
}: {
  colaboradoresCampo: string[];
  valoresIniciales: ValoresRegistroVuelo;
}) {
  const [state, formAction] = useActionState(editarRegistroVueloAction, { error: null });

  const v = state.values;

  return (
    <form
      action={formAction}
      className="flex max-w-2xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      <input type="hidden" name="id" value={valoresIniciales.id} />

      <p className="text-sm text-green-700/70 dark:text-green-200/70">
        Drone: <strong className="text-green-900 dark:text-green-50">{valoresIniciales.droneNombre}</strong> —{" "}
        {valoresIniciales.droneModelo}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Fecha"
          name="fecha"
          type="date"
          defaultValue={v?.fecha ?? valoresIniciales.fecha}
          required
        />
        <SelectField label="Operador" name="operador" defaultValue={v?.operador ?? valoresIniciales.operador} required>
          {colaboradoresCampo.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
      </div>

      <p className="text-xs text-green-700/60 dark:text-green-300/60">
        Sigue siendo la lectura acumulada a esta fecha -- al guardar se recalcula toda la cadena de
        diferencias de este drone (incluidos los registros posteriores a este).
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="Horas de Vuelo (lectura)"
          name="horasVuelo"
          type="number"
          min={0}
          step="0.01"
          defaultValue={v?.horasVuelo ?? valoresIniciales.horasVuelo}
          required
        />
        <Field
          label="Área Cubierta (lectura, ha)"
          name="areaCubierta"
          type="number"
          min={0}
          step="0.01"
          defaultValue={v?.areaCubierta ?? valoresIniciales.areaCubierta}
          required
        />
        <Field
          label="Vuelos (lectura)"
          name="vuelos"
          type="number"
          min={0}
          step="1"
          defaultValue={v?.vuelos ?? valoresIniciales.vuelos}
          required
        />
      </div>

      <div className="flex gap-3">
        <SubmitButton>Guardar cambios</SubmitButton>
        <LinkButton href="/bitacora/vuelos" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
