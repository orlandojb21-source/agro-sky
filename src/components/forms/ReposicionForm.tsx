"use client";

import { useActionState, useState } from "react";
import { crearReposicionAction, editarReposicionAction } from "@/lib/actions/caja";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { DenominacionGrid } from "@/components/forms/DenominacionGrid";

type ValoresReposicion = {
  id?: string;
  fecha: string;
  montoDetalle: Record<string, number> | null;
  nota: string | null;
};

function detalleAValoresIniciales(
  prefijo: string,
  detalle: Record<string, number> | null | undefined,
): Record<string, number> {
  if (!detalle) return {};
  return Object.fromEntries(Object.entries(detalle).map(([id, cantidad]) => [`${prefijo}_${id}`, cantidad]));
}

export function ReposicionForm({
  fechaHoy,
  valoresIniciales,
}: {
  fechaHoy: string;
  valoresIniciales?: ValoresReposicion;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarReposicionAction : crearReposicionAction,
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

      <div>
        <p className="mb-2 text-sm text-green-900 dark:text-green-100">
          Monto repuesto (billetes y monedas)
        </p>
        <DenominacionGrid prefijo="monto" valoresIniciales={montoIniciales} />
      </div>

      <Field
        label="Nota (opcional)"
        name="nota"
        defaultValue={v?.nota ?? valoresIniciales?.nota ?? undefined}
        placeholder="Ej: Reposición mensual, devolución de sobrante..."
      />

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "Guardar reposición"}</SubmitButton>
        <LinkButton href="/caja-menuda" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
