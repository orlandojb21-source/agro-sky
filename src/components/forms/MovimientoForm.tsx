"use client";

import { useActionState, useRef, useState } from "react";
import { crearGastoAction, editarGastoAction } from "@/lib/actions/caja";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

const CONCEPTOS_SUGERIDOS = ["Transporte", "Comida", "Combustible", "Hospedaje", "Materiales", "Otro"];

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

type ValoresMovimiento = {
  id?: string;
  fecha: string;
  nombre: string | null;
  concepto: string | null;
  monto: number | null;
  colaborador: string | null;
  previsto: number | null;
  entregado: number | null;
  vuelto: number | null;
  nota: string | null;
};

export function MovimientoForm({
  fechaHoy,
  valoresIniciales,
}: {
  fechaHoy: string;
  valoresIniciales?: ValoresMovimiento;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarGastoAction : crearGastoAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;

  // El "Entregado" normalmente es igual al "Previsto" -- solo cambia
  // cuando no hay efectivo exacto (ej: se necesitan $14 pero se entrega un
  // billete de $20). Copia el valor de Previsto mientras el usuario no
  // haya tocado Entregado a mano.
  const entregadoRef = useRef<HTMLInputElement>(null);
  const entregadoTocado = useRef(false);

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      <Field
        label="Fecha"
        name="fecha"
        type="date"
        defaultValue={v?.fecha ?? valoresIniciales?.fecha ?? fechaHoy}
        required
      />

      <p className="text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
        Gasto (opcional)
      </p>
      <Field
        label="Nombre (a quién se le entregó el dinero)"
        name="nombre"
        defaultValue={v?.nombre ?? valoresIniciales?.nombre ?? undefined}
      />
      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Concepto
        <input
          name="concepto"
          type="text"
          list="conceptos-sugeridos"
          defaultValue={v?.concepto ?? valoresIniciales?.concepto ?? undefined}
          placeholder="Ej: Transporte"
          className={CLASE_INPUT}
        />
        <datalist id="conceptos-sugeridos">
          {CONCEPTOS_SUGERIDOS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <Field
        label="Monto (USD)"
        name="monto"
        type="number"
        min={0}
        step="0.01"
        defaultValue={v?.monto ?? valoresIniciales?.monto ?? undefined}
      />

      <p className="text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
        Previsto / viáticos (opcional)
      </p>
      <Field
        label="Colaborador"
        name="colaborador"
        defaultValue={v?.colaborador ?? valoresIniciales?.colaborador ?? undefined}
        placeholder="Ej: Juan Pérez"
      />
      <Field
        label="Previsto del día (USD)"
        name="previsto"
        type="number"
        min={0}
        step="0.01"
        defaultValue={v?.previsto ?? valoresIniciales?.previsto ?? undefined}
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
          defaultValue={v?.entregado ?? valoresIniciales?.entregado ?? undefined}
          onChange={() => {
            entregadoTocado.current = true;
          }}
          className={CLASE_INPUT}
        />
        <span className="text-xs font-normal text-green-700/60 dark:text-green-300/60">
          Lo que realmente se entrega en efectivo. Súbelo solo si no hay cambio exacto.
        </span>
      </label>
      <Field
        label="Vuelto (USD)"
        name="vuelto"
        type="number"
        min={0}
        step="0.01"
        defaultValue={v?.vuelto ?? valoresIniciales?.vuelto ?? undefined}
        placeholder="Déjalo en blanco si aún no regresa el colaborador"
      />

      <Field
        label="Nota (opcional)"
        name="nota"
        defaultValue={v?.nota ?? valoresIniciales?.nota ?? undefined}
      />

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "Guardar movimiento"}</SubmitButton>
        <LinkButton href="/caja-menuda" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
