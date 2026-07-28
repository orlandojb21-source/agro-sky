"use client";

import { useActionState, useMemo, useState } from "react";
import { crearPagoAction, editarPagoAction } from "@/lib/actions/planilla";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

// Deducciones legales de Panama sobre el salario bruto de un colaborador
// Fijo (confirmado por el usuario). Solo se usan para sugerir un valor
// inicial editable -- el monto real que se guarda es siempre el que queda
// escrito en el campo al enviar el formulario, nunca se recalcula en el
// servidor.
const TASA_CSS = 0.0975;
const TASA_SEGURO_EDUCATIVO = 0.0125;

export type ColaboradorOpcion = {
  nombre: string;
  tipo: "fijo" | "campo";
  salario: number | null;
  aplicaDeducciones: boolean;
};

type ValoresPago = {
  id?: string;
  colaborador: string;
  fecha: string;
  descripcion: string;
  monto: number;
  tipoTrabajo?: "proyecto" | "taller" | null;
  jornada?: "completo" | "medio" | null;
  css?: number | null;
  seguroEducativo?: number | null;
};

export function PagoPlanillaForm({
  fechaHoy,
  colaboradores,
  valoresIniciales,
}: {
  fechaHoy: string;
  colaboradores: ColaboradorOpcion[];
  valoresIniciales?: ValoresPago;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarPagoAction : crearPagoAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);

  const v = state.values;

  // Si se edita un pago de un colaborador que ya se eliminó de la lista
  // administrable, se agrega igual como opción para no cambiarle el
  // colaborador sin querer al abrir el formulario -- su tipo se infiere de
  // si el pago ya tenía tipoTrabajo/jornada guardados (campo) o no (fijo).
  const opciones: ColaboradorOpcion[] = useMemo(() => {
    if (
      valoresIniciales?.colaborador &&
      !colaboradores.some((c) => c.nombre === valoresIniciales.colaborador)
    ) {
      const tipoInferido: ColaboradorOpcion["tipo"] =
        valoresIniciales.tipoTrabajo || valoresIniciales.jornada ? "campo" : "fijo";
      return [
        { nombre: valoresIniciales.colaborador, tipo: tipoInferido, salario: null, aplicaDeducciones: true },
        ...colaboradores,
      ];
    }
    return colaboradores;
  }, [colaboradores, valoresIniciales]);

  const colaboradorInicial = v?.colaborador ?? valoresIniciales?.colaborador ?? opciones[0]?.nombre ?? "";
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(colaboradorInicial);

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    setColaboradorSeleccionado(colaboradorInicial);
  }

  const colaboradorActual = opciones.find((c) => c.nombre === colaboradorSeleccionado);
  const esCampo = colaboradorActual?.tipo === "campo";
  const esFijo = colaboradorActual?.tipo === "fijo";
  // CSS/Seguro Educativo no aplican a todos los colaboradores Fijos --
  // depende de la situación legal de cada persona, marcada en Colaboradores.
  // Si se está editando un pago que YA tenía estos valores guardados, los
  // campos se siguen mostrando aunque el colaborador ya no tenga la
  // marca activa -- de lo contrario, al guardar sin verlos, se borrarían
  // en silencio (el formulario nunca manda un campo que no renderiza).
  const tieneDeduccionesHistoricas =
    esEdicion && (valoresIniciales?.css != null || valoresIniciales?.seguroEducativo != null);
  const mostrarDeducciones =
    esFijo && ((colaboradorActual?.aplicaDeducciones ?? false) || tieneDeduccionesHistoricas);
  // El salario y las deducciones solo se sugieren al crear un pago nuevo --
  // al editar uno ya existente se respeta siempre lo histórico, aunque se
  // cambie el colaborador, para no pisar un ajuste que ya se hizo a mano.
  const montoSugerido = !esEdicion && esFijo ? colaboradorActual!.salario : null;
  const cssSugerido = montoSugerido !== null ? Math.round(montoSugerido * TASA_CSS * 100) / 100 : null;
  const seguroEducativoSugerido =
    montoSugerido !== null ? Math.round(montoSugerido * TASA_SEGURO_EDUCATIVO * 100) / 100 : null;

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      {opciones.length === 0 ? (
        <p className="text-sm text-green-700/70 dark:text-green-300/70">
          Todavía no hay colaboradores registrados.{" "}
          <LinkButton href="/planilla/colaboradores" variant="secondary">
            Agregar colaborador
          </LinkButton>
        </p>
      ) : (
        <SelectField
          label="Colaborador"
          name="colaborador"
          defaultValue={colaboradorInicial}
          onChange={(e) => setColaboradorSeleccionado(e.target.value)}
          required
        >
          {opciones.map((c) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre} — {c.tipo === "fijo" ? "Fijo" : "Campo"}
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

      {esCampo && (
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Tipo de trabajo"
            name="tipoTrabajo"
            defaultValue={v?.tipoTrabajo ?? valoresIniciales?.tipoTrabajo ?? "proyecto"}
            required
          >
            <option value="proyecto">Proyecto</option>
            <option value="taller">Taller</option>
          </SelectField>
          <SelectField
            label="Jornada"
            name="jornada"
            defaultValue={v?.jornada ?? valoresIniciales?.jornada ?? "completo"}
            required
          >
            <option value="completo">Día completo</option>
            <option value="medio">Medio día</option>
          </SelectField>
        </div>
      )}

      <Field
        label="Descripción"
        name="descripcion"
        defaultValue={v?.descripcion ?? valoresIniciales?.descripcion ?? undefined}
        placeholder="Ej: Salario quincenal, riego finca La Loma..."
        required
      />

      <Field
        key={`monto-${colaboradorSeleccionado}`}
        label="Monto pagado (USD)"
        name="monto"
        type="number"
        min={0}
        step="0.01"
        defaultValue={v?.monto ?? valoresIniciales?.monto ?? montoSugerido ?? undefined}
        required
      />

      {mostrarDeducciones && (
        <div className="grid grid-cols-2 gap-4">
          <Field
            key={`css-${colaboradorSeleccionado}`}
            label="CSS (9.75%)"
            name="css"
            type="number"
            min={0}
            step="0.01"
            defaultValue={v?.css ?? valoresIniciales?.css ?? cssSugerido ?? undefined}
          />
          <Field
            key={`seguroEducativo-${colaboradorSeleccionado}`}
            label="Seguro Educativo (1.25%)"
            name="seguroEducativo"
            type="number"
            min={0}
            step="0.01"
            defaultValue={v?.seguroEducativo ?? valoresIniciales?.seguroEducativo ?? seguroEducativoSugerido ?? undefined}
          />
        </div>
      )}

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "Guardar pago"}</SubmitButton>
        <LinkButton href="/planilla" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
