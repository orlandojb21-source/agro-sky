"use client";

import { useActionState } from "react";
import { crearDroneAction, editarDroneAction } from "@/lib/actions/drones";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

type ValoresDrone = {
  id?: string;
  nombre: string;
  modelo: string;
  fechaActivacion: string | null;
  numeroSerieAeronave: string | null;
  numeroSerieFabrica: string | null;
  areaCubierta: number;
  horasVuelo: number;
  vuelos: number;
};

export function DroneForm({
  colaboradoresCampo,
  valoresIniciales,
}: {
  colaboradoresCampo: string[];
  valoresIniciales?: ValoresDrone;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(esEdicion ? editarDroneAction : crearDroneAction, {
    error: null,
  });

  const v = state.values;

  return (
    <form
      action={formAction}
      className="flex max-w-2xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      <span className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
        Datos del Drone
      </span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Nombre"
          name="nombre"
          defaultValue={v?.nombre ?? valoresIniciales?.nombre ?? undefined}
          required
        />
        <Field
          label="Modelo"
          name="modelo"
          defaultValue={v?.modelo ?? valoresIniciales?.modelo ?? undefined}
          required
        />
        <Field
          label="Fecha de activación (opcional)"
          name="fechaActivacion"
          type="date"
          defaultValue={v?.fechaActivacion ?? valoresIniciales?.fechaActivacion ?? undefined}
        />
        <Field
          label="N/S de la aeronave (opcional)"
          name="numeroSerieAeronave"
          defaultValue={v?.numeroSerieAeronave ?? valoresIniciales?.numeroSerieAeronave ?? undefined}
          placeholder="Opcional"
        />
        <Field
          label="N/S de Fábrica (opcional)"
          name="numeroSerieFabrica"
          defaultValue={v?.numeroSerieFabrica ?? valoresIniciales?.numeroSerieFabrica ?? undefined}
          placeholder="Opcional"
        />
      </div>

      <span className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
        Registro de Vuelo
      </span>
      <p className="-mt-2 text-xs text-green-700/60 dark:text-green-300/60">
        Totales acumulados -- se actualizan a mano, tomados del propio control del drone.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="Área Cubierta (ha)"
          name="areaCubierta"
          type="number"
          min={0}
          step="0.01"
          defaultValue={v?.areaCubierta ?? valoresIniciales?.areaCubierta ?? 0}
        />
        <Field
          label="Horas de Vuelo"
          name="horasVuelo"
          type="number"
          min={0}
          step="0.01"
          defaultValue={v?.horasVuelo ?? valoresIniciales?.horasVuelo ?? 0}
        />
        <Field
          label="Vuelos"
          name="vuelos"
          type="number"
          min={0}
          step="1"
          defaultValue={v?.vuelos ?? valoresIniciales?.vuelos ?? 0}
        />
      </div>

      {!esEdicion && (
        <>
          <span className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
            Operador asignado
          </span>
          <SelectField
            label="Operador inicial (opcional)"
            name="operadorInicial"
            defaultValue={v?.operadorInicial ?? undefined}
          >
            <option value="">Sin asignar todavía</option>
            {colaboradoresCampo.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <p className="-mt-2 text-xs text-green-700/60 dark:text-green-300/60">
            Se puede asignar o reasignar más adelante desde la ficha del drone -- queda un historial de cada
            cambio.
          </p>
        </>
      )}

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "Guardar drone"}</SubmitButton>
        <LinkButton
          href={esEdicion ? `/bitacora/${valoresIniciales!.id}` : "/bitacora"}
          variant="secondary"
        >
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
