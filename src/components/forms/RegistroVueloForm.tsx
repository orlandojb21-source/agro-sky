"use client";

import { useActionState, useState } from "react";
import { registrarVueloDroneAction } from "@/lib/actions/dronesVuelos";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

export type DroneOpcionVuelo = {
  id: string;
  nombre: string;
  modelo: string;
  areaCubierta: number;
  horasVuelo: number;
  vuelos: number;
  operadorActual: string | null;
};

function formatDelta(d: number | null): string {
  if (d === null) return "—";
  return d >= 0 ? `+${d}` : String(d);
}

export function RegistroVueloForm({
  drones,
  colaboradoresCampo,
  fechaHoy,
  droneIdInicial,
}: {
  drones: DroneOpcionVuelo[];
  colaboradoresCampo: string[];
  fechaHoy: string;
  droneIdInicial?: string;
}) {
  const [state, formAction] = useActionState(registrarVueloDroneAction, { error: null });

  const droneInicial = drones.find((d) => d.id === (droneIdInicial ?? drones[0]?.id));
  const [droneId, setDroneId] = useState(droneIdInicial ?? drones[0]?.id ?? "");
  // Se autollena con el operador actual del drone elegido -- sigue
  // totalmente editable después, por si voló otra persona (mismo
  // principio de "sugerido pero editable" que ya usa el resto de la app).
  const [operador, setOperador] = useState(droneInicial?.operadorActual ?? "");
  const [horasVuelo, setHorasVuelo] = useState("");
  const [areaCubierta, setAreaCubierta] = useState("");
  const [vuelos, setVuelos] = useState("");

  const droneElegido = drones.find((d) => d.id === droneId);

  function elegirDrone(id: string) {
    setDroneId(id);
    const drone = drones.find((d) => d.id === id);
    setOperador(drone?.operadorActual ?? "");
  }

  function delta(nuevoTexto: string, actual: number | undefined): number | null {
    if (actual === undefined || nuevoTexto === "") return null;
    const nuevo = Number(nuevoTexto);
    if (Number.isNaN(nuevo)) return null;
    return Math.round((nuevo - actual) * 100) / 100;
  }

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
        <SelectField label="Drone" name="droneId" value={droneId} onChange={(e) => elegirDrone(e.target.value)} required>
          {drones.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre} — {d.modelo}
            </option>
          ))}
        </SelectField>
        <SelectField label="Operador" name="operador" value={operador} onChange={(e) => setOperador(e.target.value)} required>
          <option value="">Selecciona...</option>
          {colaboradoresCampo.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
      </div>
      <Field label="Fecha" name="fecha" type="date" defaultValue={fechaHoy} required />

      {droneElegido && (
        <p className="text-xs text-green-700/70 dark:text-green-300/70">
          Última lectura de {droneElegido.nombre}: {droneElegido.areaCubierta} ha — {droneElegido.horasVuelo}{" "}
          hrs — {droneElegido.vuelos} vuelos.
        </p>
      )}

      <p className="text-xs text-green-700/60 dark:text-green-300/60">
        Anotá la lectura NUEVA (el total acumulado a esta fecha, tal cual la muestra el drone) -- no lo que
        sumó este trabajo. Al guardar se calcula sola la diferencia.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="Horas de Vuelo (lectura nueva)"
          name="horasVuelo"
          type="number"
          min={0}
          step="0.01"
          value={horasVuelo}
          onChange={(e) => setHorasVuelo(e.target.value)}
          required
        />
        <Field
          label="Área Cubierta (lectura nueva, ha)"
          name="areaCubierta"
          type="number"
          min={0}
          step="0.01"
          value={areaCubierta}
          onChange={(e) => setAreaCubierta(e.target.value)}
          required
        />
        <Field
          label="Vuelos (lectura nueva)"
          name="vuelos"
          type="number"
          min={0}
          step="1"
          value={vuelos}
          onChange={(e) => setVuelos(e.target.value)}
          required
        />
      </div>

      {droneElegido && (horasVuelo !== "" || areaCubierta !== "" || vuelos !== "") && (
        <p className="text-sm text-green-800 dark:text-green-200">
          Diferencia a guardar: Horas {formatDelta(delta(horasVuelo, droneElegido.horasVuelo))} · Área{" "}
          {formatDelta(delta(areaCubierta, droneElegido.areaCubierta))} ha · Vuelos{" "}
          {formatDelta(delta(vuelos, droneElegido.vuelos))}
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton>Guardar registro</SubmitButton>
        <LinkButton href="/bitacora/vuelos" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
