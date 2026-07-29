"use client";

import { useActionState, useState } from "react";
import { crearGastoAction, editarGastoAction } from "@/lib/actions/caja";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { DenominacionGrid } from "@/components/forms/DenominacionGrid";
import { CATEGORIAS_GASTO } from "@/lib/categorias";

const CONCEPTOS_SUGERIDOS = ["Transporte", "Comida", "Combustible", "Hospedaje", "Materiales", "Otro"];

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

type ValoresMovimiento = {
  id?: string;
  fecha: string;
  categoria: string | null;
  nombre: string | null;
  numeroRecibo: string | null;
  concepto: string | null;
  montoDetalle: Record<string, number> | null;
  colaborador: string | null;
  previsto: number | null;
  entregadoDetalle: Record<string, number> | null;
  vueltoDetalle: Record<string, number> | null;
  nota: string | null;
};

// Convierte el detalle guardado en la BD ({ b20: 3, m25: 2, ... }) en el
// formato de campos con prefijo que espera DenominacionGrid como valor
// inicial ({ monto_b20: 3, monto_m25: 2, ... }).
function detalleAValoresIniciales(
  prefijo: string,
  detalle: Record<string, number> | null | undefined,
): Record<string, number> {
  if (!detalle) return {};
  return Object.fromEntries(Object.entries(detalle).map(([id, cantidad]) => [`${prefijo}_${id}`, cantidad]));
}

export function MovimientoForm({
  fechaHoy,
  colaboradores,
  valoresIniciales,
}: {
  fechaHoy: string;
  colaboradores: string[];
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

  const montoIniciales = v ?? detalleAValoresIniciales("monto", valoresIniciales?.montoDetalle);
  const entregadoIniciales = v ?? detalleAValoresIniciales("entregado", valoresIniciales?.entregadoDetalle);
  const vueltoIniciales = v ?? detalleAValoresIniciales("vuelto", valoresIniciales?.vueltoDetalle);

  // Si se edita un gasto de un colaborador que ya se eliminó de la lista
  // administrable de Planilla, se agrega igual como opción para no cambiar
  // el nombre sin querer al abrir el formulario.
  const opcionesNombre =
    valoresIniciales?.nombre && !colaboradores.includes(valoresIniciales.nombre)
      ? [valoresIniciales.nombre, ...colaboradores]
      : colaboradores;

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-2xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
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
      <SelectField
        label="Categoría"
        name="categoria"
        defaultValue={v?.categoria ?? valoresIniciales?.categoria ?? undefined}
        required
      >
        <option value="">Selecciona...</option>
        {CATEGORIAS_GASTO.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>

      <p className="text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
        Gasto (opcional)
      </p>
      <SelectField
        label="Nombre (a quién se le entregó el dinero)"
        name="nombre"
        defaultValue={v?.nombre ?? valoresIniciales?.nombre ?? ""}
      >
        <option value="">Selecciona...</option>
        {opcionesNombre.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
      <Field
        label="# de recibo"
        name="numeroRecibo"
        defaultValue={v?.numeroRecibo ?? valoresIniciales?.numeroRecibo ?? undefined}
        placeholder="Ej: 0123"
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
      <div>
        <p className="mb-2 text-sm text-green-900 dark:text-green-100">
          Monto entregado (billetes y monedas)
        </p>
        <DenominacionGrid prefijo="monto" valoresIniciales={montoIniciales} />
      </div>

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
      />
      <div>
        <p className="mb-2 text-sm text-green-900 dark:text-green-100">
          Entregado (billetes y monedas realmente entregados)
        </p>
        <DenominacionGrid prefijo="entregado" valoresIniciales={entregadoIniciales} />
      </div>
      <div>
        <p className="mb-2 text-sm text-green-900 dark:text-green-100">
          Vuelto (déjalo en cero si aún no regresa el colaborador)
        </p>
        <DenominacionGrid prefijo="vuelto" valoresIniciales={vueltoIniciales} />
      </div>

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
