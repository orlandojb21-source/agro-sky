"use client";

import { useActionState, useState } from "react";
import { crearAsistenciaAction, editarAsistenciaAction } from "@/lib/actions/asistencia";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

export type ColaboradorCampoOpcion = { nombre: string };

type ValoresAsistencia = {
  id?: string;
  colaborador: string;
  fecha: string;
  rolDia: "operador" | "ayudante";
  tipoTrabajo: "proyecto" | "oficina";
  jornada: "completo" | "medio" | "proyecto";
  tipoProyecto: "ingenio_santa_rosa" | "particular" | null;
  descripcion: string;
};

export function AsistenciaForm({
  fechaHoy,
  colaboradores,
  valoresIniciales,
}: {
  fechaHoy: string;
  colaboradores: ColaboradorCampoOpcion[];
  valoresIniciales?: ValoresAsistencia;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarAsistenciaAction : crearAsistenciaAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);

  const v = state.values;

  const colaboradorInicial = v?.colaborador ?? valoresIniciales?.colaborador ?? colaboradores[0]?.nombre ?? "";
  const tipoTrabajoInicial = v?.tipoTrabajo ?? valoresIniciales?.tipoTrabajo ?? "proyecto";
  const jornadaInicial = v?.jornada ?? valoresIniciales?.jornada ?? "completo";
  // Si la jornada guardada es "proyecto" pero el tipo de trabajo cambia a
  // Oficina, la jornada de Oficina que se sugiere no debe arrancar en
  // "proyecto" (esa jornada no aplica a Oficina).
  const jornadaOficinaInicial = jornadaInicial === "proyecto" ? "completo" : jornadaInicial;
  const tipoProyectoInicial = v?.tipoProyecto ?? valoresIniciales?.tipoProyecto ?? "ingenio_santa_rosa";

  const [tipoTrabajoSeleccionado, setTipoTrabajoSeleccionado] = useState(tipoTrabajoInicial);

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    setTipoTrabajoSeleccionado(tipoTrabajoInicial);
  }

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      {colaboradores.length === 0 ? (
        <p className="text-sm text-green-700/70 dark:text-green-300/70">
          Todavía no hay colaboradores de Campo registrados.{" "}
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

      <SelectField
        label="Rol"
        name="rolDia"
        defaultValue={v?.rolDia ?? valoresIniciales?.rolDia ?? "operador"}
        required
      >
        <option value="operador">Operador</option>
        <option value="ayudante">Ayudante</option>
      </SelectField>

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Tipo de trabajo"
          name="tipoTrabajo"
          defaultValue={tipoTrabajoInicial}
          onChange={(e) => setTipoTrabajoSeleccionado(e.target.value)}
          required
        >
          <option value="proyecto">Proyecto</option>
          <option value="oficina">Oficina</option>
        </SelectField>
        {tipoTrabajoSeleccionado === "proyecto" ? (
          <div className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
            Jornada
            <input type="hidden" name="jornada" value="proyecto" />
            <p className="rounded-lg border border-green-100 bg-green-50/60 px-3 py-2 text-green-700/80 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300/80">
              Proyecto
            </p>
          </div>
        ) : (
          <SelectField label="Jornada" name="jornada" defaultValue={jornadaOficinaInicial} required>
            <option value="completo">Día completo</option>
            <option value="medio">Medio día</option>
          </SelectField>
        )}
      </div>

      {tipoTrabajoSeleccionado === "proyecto" && (
        <SelectField label="Tipo de proyecto" name="tipoProyecto" defaultValue={tipoProyectoInicial} required>
          <option value="ingenio_santa_rosa">Ingenio Santa Rosa</option>
          <option value="particular">Trabajo Particular</option>
        </SelectField>
      )}

      <Field
        label="Descripción"
        name="descripcion"
        defaultValue={v?.descripcion ?? valoresIniciales?.descripcion ?? undefined}
        placeholder="Ej: Riego finca La Loma..."
        required
      />

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "Guardar asistencia"}</SubmitButton>
        <LinkButton href="/planilla" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
