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
  tipoTrabajo: "proyecto" | "oficina" | "sin_trabajo";
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
  // Un registro histórico de tipo "proyecto" (de antes de que el Informe de
  // Campo pasara a ser la fuente de un día de Proyecto con trabajo normal,
  // ver migración 0044 en adelante) se sigue pudiendo editar tal cual --
  // no se pierde ni se fuerza a migrar -- pero ya no se puede CREAR uno
  // nuevo así. Distinto de "sin_trabajo" (día de Proyecto sin Informe
  // porque no se pudo trabajar, ej. lluvia -- ver migración 0081), que sí
  // se puede crear y editar libremente.
  const esProyectoHistorico = esEdicion && valoresIniciales?.tipoTrabajo === "proyecto";
  const tipoTrabajoInicial = esProyectoHistorico
    ? (v?.tipoTrabajo ?? valoresIniciales?.tipoTrabajo ?? "proyecto")
    : (v?.tipoTrabajo ?? valoresIniciales?.tipoTrabajo ?? "oficina");
  const jornadaInicial = v?.jornada ?? valoresIniciales?.jornada ?? "completo";
  // Si la jornada guardada es "proyecto" (placeholder histórico) pero el
  // tipo de trabajo cambia a Oficina o a "sin_trabajo", la jornada
  // sugerida no debe arrancar en "proyecto" -- ese valor no aplica a
  // ninguno de los dos.
  const jornadaRealInicial = jornadaInicial === "proyecto" ? "completo" : jornadaInicial;

  const [tipoTrabajoSeleccionado, setTipoTrabajoSeleccionado] = useState(tipoTrabajoInicial);
  const [tipoProyectoTexto, setTipoProyectoTexto] = useState(
    v?.tipoProyecto ?? valoresIniciales?.tipoProyecto ?? "",
  );

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    setTipoTrabajoSeleccionado(tipoTrabajoInicial);
    setTipoProyectoTexto(v?.tipoProyecto ?? valoresIniciales?.tipoProyecto ?? "");
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

      <SelectField
        label="Tipo de trabajo"
        name="tipoTrabajo"
        defaultValue={tipoTrabajoInicial}
        onChange={(e) => setTipoTrabajoSeleccionado(e.target.value)}
        required
      >
        {esProyectoHistorico && <option value="proyecto">Proyecto (histórico)</option>}
        <option value="oficina">Oficina</option>
        <option value="sin_trabajo">Proyecto — no se pudo trabajar</option>
      </SelectField>

      {tipoTrabajoSeleccionado === "proyecto" ? (
        <>
          <input type="hidden" name="jornada" value="proyecto" />
          <p className="text-xs text-green-700/60 dark:text-green-300/60">
            Registro histórico de Proyecto -- el tipo de proyecto y las hectáreas de este día vivían en
            el Informe de Campo de esa fecha, no aquí.
          </p>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Jornada" name="jornada" defaultValue={jornadaRealInicial} required>
            <option value="completo">Día completo</option>
            <option value="medio">Medio día</option>
          </SelectField>
          {tipoTrabajoSeleccionado === "sin_trabajo" && (
            <SelectField
              label="Tipo de proyecto"
              name="tipoProyecto"
              value={tipoProyectoTexto}
              onChange={(e) => setTipoProyectoTexto(e.target.value)}
              required
            >
              <option value="">Selecciona...</option>
              <option value="ingenio_santa_rosa">Ingenio Santa Rosa</option>
              <option value="particular">Trabajo Particular</option>
            </SelectField>
          )}
        </div>
      )}

      {tipoTrabajoSeleccionado === "sin_trabajo" ? (
        <p className="text-xs text-green-700/60 dark:text-green-300/60">
          Usa esta opción solo cuando el equipo fue a trabajar pero no se pudo regar (lluvia, falla
          mecánica, etc.) -- igual cuenta el salario base del día en el pago sugerido. Para un día de
          Proyecto en el que sí se pudo trabajar, no registres nada aquí, lo confirma el propio Informe
          de Campo.
        </p>
      ) : tipoTrabajoSeleccionado === "oficina" ? (
        <p className="text-xs text-green-700/60 dark:text-green-300/60">
          Un día de Proyecto con trabajo normal lo confirma el propio Informe de Campo, no hace falta
          registrarlo aquí también.
        </p>
      ) : null}

      <Field
        label={tipoTrabajoSeleccionado === "sin_trabajo" ? "Motivo" : "Descripción"}
        name="descripcion"
        defaultValue={v?.descripcion ?? valoresIniciales?.descripcion ?? undefined}
        placeholder={
          tipoTrabajoSeleccionado === "sin_trabajo" ? "Ej: Lluvia todo el día" : "Ej: Riego finca La Loma..."
        }
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
