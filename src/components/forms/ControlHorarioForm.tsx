"use client";

import { useActionState, useState } from "react";
import { crearControlHorarioAction, editarControlHorarioAction } from "@/lib/actions/controlHorario";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

export type ColaboradorFijoOpcion = { nombre: string };

type ValoresControlHorario = {
  id?: string;
  colaborador: string;
  fecha: string;
  cumplio: boolean;
  nota: string | null;
};

export function ControlHorarioForm({
  fechaHoy,
  colaboradores,
  valoresIniciales,
}: {
  fechaHoy: string;
  colaboradores: ColaboradorFijoOpcion[];
  valoresIniciales?: ValoresControlHorario;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarControlHorarioAction : crearControlHorarioAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;
  const colaboradorInicial = v?.colaborador ?? valoresIniciales?.colaborador ?? colaboradores[0]?.nombre ?? "";
  const cumplioInicial = v?.cumplio ?? (valoresIniciales ? (valoresIniciales.cumplio ? "si" : "no") : "si");

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-md flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      {colaboradores.length === 0 ? (
        <p className="text-sm text-green-700/70 dark:text-green-300/70">
          Todavía no hay colaboradores Fijos registrados.{" "}
          <LinkButton href="/planilla/colaboradores" variant="secondary">
            Agregar colaborador
          </LinkButton>
        </p>
      ) : (
        <SelectField label="Colaborador" name="colaborador" defaultValue={colaboradorInicial} required>
          {colaboradores.map((c) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </SelectField>
      )}

      <Field
        label="Fecha"
        name="fecha"
        type="date"
        defaultValue={v?.fecha ?? valoresIniciales?.fecha ?? fechaHoy}
        required
      />

      <SelectField label="Asistencia" name="cumplio" defaultValue={cumplioInicial} required>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </SelectField>

      <Field
        label="Nota"
        name="nota"
        defaultValue={v?.nota ?? valoresIniciales?.nota ?? undefined}
        placeholder="Opcional -- ej: llegó tarde, permiso médico..."
      />

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "Guardar registro"}</SubmitButton>
        <LinkButton href="/planilla/horario" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
