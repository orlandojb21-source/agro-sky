"use client";

import { useActionState, useState } from "react";
import { crearMantenimientoPreventivoAction } from "@/lib/actions/dronesMantenimiento";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

export type DroneOpcionPreventivo = {
  id: string;
  nombre: string;
  modelo: string;
  horasVuelo: number;
  areaCubierta: number;
  vuelos: number;
};

export function PreventivoMantenimientoForm({
  drones,
  fechaHoy,
  droneIdInicial,
}: {
  drones: DroneOpcionPreventivo[];
  fechaHoy: string;
  droneIdInicial?: string;
}) {
  const [state, formAction] = useActionState(crearMantenimientoPreventivoAction, { error: null });

  const [droneId, setDroneId] = useState(droneIdInicial ?? drones[0]?.id ?? "");
  const droneElegido = drones.find((d) => d.id === droneId);

  if (drones.length === 0) {
    return (
      <p className="text-sm text-green-700/70 dark:text-green-200/70">
        Todavía no hay drones registrados.{" "}
        <LinkButton href="/bitacora/nuevo" variant="secondary">
          Agregar drone
        </LinkButton>
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="flex max-w-2xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Drone" name="droneId" value={droneId} onChange={(e) => setDroneId(e.target.value)} required>
          {drones.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre} — {d.modelo}
            </option>
          ))}
        </SelectField>
        <Field
          label="Tipo de mantenimiento"
          name="tipo"
          defaultValue={state.values?.tipo}
          placeholder="Ej: Revisión de motores, Cambio de ESC..."
          required
        />
      </div>
      <Field label="Fecha" name="fecha" type="date" defaultValue={state.values?.fecha ?? fechaHoy} required />

      {droneElegido && (
        <p className="text-xs text-green-700/70 dark:text-green-300/70">
          Totales actuales de {droneElegido.nombre}: {droneElegido.areaCubierta} ha — {droneElegido.horasVuelo}{" "}
          hrs — {droneElegido.vuelos} vuelos (queda guardado como referencia de este mantenimiento).
        </p>
      )}

      <p className="text-xs text-green-700/60 dark:text-green-300/60">
        Próximo mantenimiento de este tipo -- cargá al menos uno (el que llegue primero avisa). Ej: motores
        cada 100 horas de vuelo, ESC cada 6 meses (referencia DJI para el T40).
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field
          label="En cuántas horas de vuelo más"
          name="intervaloHoras"
          type="number"
          min={0}
          step="0.01"
          defaultValue={state.values?.intervaloHoras}
          placeholder="Opcional"
        />
        <Field
          label="En cuántas hectáreas más"
          name="intervaloHectareas"
          type="number"
          min={0}
          step="0.01"
          defaultValue={state.values?.intervaloHectareas}
          placeholder="Opcional"
        />
        <Field
          label="En cuántos vuelos más"
          name="intervaloVuelos"
          type="number"
          min={0}
          step="1"
          defaultValue={state.values?.intervaloVuelos}
          placeholder="Opcional"
        />
        <Field
          label="En cuántos meses"
          name="intervaloMeses"
          type="number"
          min={0}
          step="1"
          defaultValue={state.values?.intervaloMeses}
          placeholder="Opcional"
        />
      </div>

      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Notas (opcional)
        <textarea
          name="notas"
          rows={3}
          defaultValue={state.values?.notas}
          className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
        />
      </label>

      <div className="flex gap-3">
        <SubmitButton>Guardar mantenimiento</SubmitButton>
        <LinkButton href="/bitacora/mantenimiento" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
