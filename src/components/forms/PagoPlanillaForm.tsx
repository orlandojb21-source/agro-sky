"use client";

import { useActionState, useMemo, useState } from "react";
import { crearPagoAction, editarPagoAction } from "@/lib/actions/planilla";
import { obtenerResumenAsistenciaAction, type ResumenAsistencia } from "@/lib/actions/asistencia";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";

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
  fechaDesde?: string | null;
  descripcion: string;
  monto: number;
  tipoTrabajo?: "proyecto" | "oficina" | null;
  jornada?: "completo" | "medio" | "proyecto" | null;
  css?: number | null;
  seguroEducativo?: number | null;
  bonificacion?: number | null;
};

function calcularDeduccion(montoTexto: string, tasa: number): string {
  const monto = Number(montoTexto);
  if (!montoTexto || Number.isNaN(monto) || monto <= 0) return "";
  return String(Math.round(monto * tasa * 100) / 100);
}

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
  // si el pago ya tenía tipoTrabajo/jornada (Campo histórico) o fechaDesde
  // (Campo, quincena) guardados, o ninguno de los dos (Fijo).
  const opciones: ColaboradorOpcion[] = useMemo(() => {
    if (
      valoresIniciales?.colaborador &&
      !colaboradores.some((c) => c.nombre === valoresIniciales.colaborador)
    ) {
      const tipoInferido: ColaboradorOpcion["tipo"] =
        valoresIniciales.tipoTrabajo || valoresIniciales.jornada || valoresIniciales.fechaDesde
          ? "campo"
          : "fijo";
      return [
        { nombre: valoresIniciales.colaborador, tipo: tipoInferido, salario: null, aplicaDeducciones: true },
        ...colaboradores,
      ];
    }
    return colaboradores;
  }, [colaboradores, valoresIniciales]);

  const colaboradorInicial = v?.colaborador ?? valoresIniciales?.colaborador ?? opciones[0]?.nombre ?? "";

  // Calcula el monto/CSS/Seguro Educativo con los que arrancar el formulario
  // para un colaborador dado: si ya se intentó enviar (v) o se está
  // editando un pago con deducciones ya guardadas, se respeta eso tal cual;
  // si no, se sugiere el salario y sus deducciones al 9.75%/1.25% -- pero
  // solo si el colaborador es Fijo.
  function datosIniciales(nombreColaborador: string) {
    const colaborador = opciones.find((c) => c.nombre === nombreColaborador);
    const esFijoColab = colaborador?.tipo === "fijo";
    const montoSugerido = !esEdicion && esFijoColab && colaborador?.salario !== null ? String(colaborador!.salario) : "";
    const monto =
      v?.monto ?? (valoresIniciales?.monto != null ? String(valoresIniciales.monto) : montoSugerido);
    const cssHistorico = v?.css ?? (valoresIniciales?.css != null ? String(valoresIniciales.css) : null);
    const seguroHistorico =
      v?.seguroEducativo ?? (valoresIniciales?.seguroEducativo != null ? String(valoresIniciales.seguroEducativo) : null);
    const css = cssHistorico ?? (esFijoColab ? calcularDeduccion(monto, TASA_CSS) : "");
    const seguroEducativo = seguroHistorico ?? (esFijoColab ? calcularDeduccion(monto, TASA_SEGURO_EDUCATIVO) : "");
    return { monto, css, seguroEducativo };
  }

  const fechaHastaInicial = v?.fecha ?? valoresIniciales?.fecha ?? fechaHoy;
  const fechaDesdeInicial = v?.fechaDesde ?? valoresIniciales?.fechaDesde ?? "";

  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(colaboradorInicial);
  const [montoTexto, setMontoTexto] = useState(() => datosIniciales(colaboradorInicial).monto);
  const [cssTexto, setCssTexto] = useState(() => datosIniciales(colaboradorInicial).css);
  const [seguroTexto, setSeguroTexto] = useState(() => datosIniciales(colaboradorInicial).seguroEducativo);
  const [fechaDesdeTexto, setFechaDesdeTexto] = useState(fechaDesdeInicial);
  const [fechaHastaTexto, setFechaHastaTexto] = useState(fechaHastaInicial);
  const [resumenAsistencia, setResumenAsistencia] = useState<ResumenAsistencia | null>(null);
  const [buscandoResumen, setBuscandoResumen] = useState(false);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    const iniciales = datosIniciales(colaboradorInicial);
    setColaboradorSeleccionado(colaboradorInicial);
    setMontoTexto(iniciales.monto);
    setCssTexto(iniciales.css);
    setSeguroTexto(iniciales.seguroEducativo);
    setFechaDesdeTexto(fechaDesdeInicial);
    setFechaHastaTexto(fechaHastaInicial);
    setResumenAsistencia(null);
    setErrorResumen(null);
  }

  function cambiarColaborador(nombre: string) {
    setColaboradorSeleccionado(nombre);
    const iniciales = datosIniciales(nombre);
    setMontoTexto(iniciales.monto);
    setCssTexto(iniciales.css);
    setSeguroTexto(iniciales.seguroEducativo);
    setFechaDesdeTexto(fechaDesdeInicial);
    setFechaHastaTexto(fechaHastaInicial);
    setResumenAsistencia(null);
    setErrorResumen(null);
  }

  // El monto se pre-llena con el cálculo sugerido, pero sigue totalmente
  // editable después -- el jefe puede ajustarlo a mano si hace falta,
  // nunca se guarda sin que él lo confirme.
  async function verResumenAsistencia() {
    setBuscandoResumen(true);
    setErrorResumen(null);
    try {
      const resultado = await obtenerResumenAsistenciaAction(
        colaboradorSeleccionado,
        fechaDesdeTexto,
        fechaHastaTexto,
      );
      setResumenAsistencia(resultado);
      setMontoTexto(String(resultado.totalSugerido));
    } catch (err) {
      setErrorResumen(err instanceof Error ? err.message : "No se pudo consultar la asistencia.");
    } finally {
      setBuscandoResumen(false);
    }
  }

  // Las deducciones siempre siguen al monto mientras se está escribiendo --
  // si el monto cambia (ej. un ajuste manual), CSS/Seguro Educativo se
  // recalculan al 9.75%/1.25% del nuevo monto, sin quedarse ancladas al
  // salario original. Siguen siendo editables a mano después de esto.
  function cambiarMonto(texto: string) {
    setMontoTexto(texto);
    setCssTexto(calcularDeduccion(texto, TASA_CSS));
    setSeguroTexto(calcularDeduccion(texto, TASA_SEGURO_EDUCATIVO));
  }

  const colaboradorActual = opciones.find((c) => c.nombre === colaboradorSeleccionado);
  const esCampo = colaboradorActual?.tipo === "campo";
  const esFijo = colaboradorActual?.tipo === "fijo";
  // Un pago de Campo histórico (de antes de este cambio) todavía tiene
  // tipoTrabajo/jornada guardados -- ya no se capturan en pagos nuevos
  // (eso ahora vive en Asistencia), pero tampoco se pueden perder al
  // editarlo, así que se muestran como fecha única + valores fijos en vez
  // del par Fecha desde/hasta + resumen de asistencia.
  const esHistoricoCampo =
    esEdicion && esCampo && Boolean(valoresIniciales?.tipoTrabajo || valoresIniciales?.jornada);
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
          onChange={(e) => cambiarColaborador(e.target.value)}
          required
        >
          {opciones.map((c) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre} — {c.tipo === "fijo" ? "Fijo" : "Campo"}
            </option>
          ))}
        </SelectField>
      )}

      {esHistoricoCampo ? (
        <>
          <Field
            label="Fecha"
            name="fecha"
            type="date"
            defaultValue={v?.fecha ?? valoresIniciales?.fecha ?? fechaHoy}
            required
          />
          {/* Pago histórico de Campo (día por día, de antes de este
              cambio) -- tipoTrabajo/jornada ya no se editan, pero se
              reenvían tal cual para no borrarlos al guardar. */}
          <input type="hidden" name="tipoTrabajo" value={valoresIniciales?.tipoTrabajo ?? ""} />
          <input type="hidden" name="jornada" value={valoresIniciales?.jornada ?? ""} />
        </>
      ) : esCampo ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Fecha desde"
              name="fechaDesde"
              type="date"
              value={fechaDesdeTexto}
              onChange={(e) => {
                setFechaDesdeTexto(e.target.value);
                setResumenAsistencia(null);
              }}
              required
            />
            <Field
              label="Fecha hasta"
              name="fecha"
              type="date"
              value={fechaHastaTexto}
              onChange={(e) => {
                setFechaHastaTexto(e.target.value);
                setResumenAsistencia(null);
              }}
              required
            />
          </div>
          <div className="rounded-lg border border-green-100 p-3 dark:border-green-900/40">
            <button
              type="button"
              onClick={verResumenAsistencia}
              disabled={buscandoResumen || !colaboradorSeleccionado || !fechaDesdeTexto || !fechaHastaTexto}
              className="rounded-lg border border-green-300 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-950/40"
            >
              {buscandoResumen ? "Calculando..." : "Calcular pago sugerido"}
            </button>
            {errorResumen && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorResumen}</p>}
            {resumenAsistencia && (
              <p className="mt-2 text-sm text-green-800/80 dark:text-green-200/80">
                {resumenAsistencia.totalDias === 0 ? (
                  "No hay asistencia registrada en este período."
                ) : (
                  <>
                    {resumenAsistencia.totalDias} día(s) registrados — Total sugerido:{" "}
                    <strong>{formatMoney(resumenAsistencia.totalSugerido)}</strong> ({resumenAsistencia.diasOficina}{" "}
                    día(s) Oficina, {resumenAsistencia.diasProyecto} día(s) Proyecto con{" "}
                    {resumenAsistencia.hectareasProyecto} hectáreas)
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      ) : (
        <Field
          label="Fecha"
          name="fecha"
          type="date"
          defaultValue={v?.fecha ?? valoresIniciales?.fecha ?? fechaHoy}
          required
        />
      )}

      <Field
        label="Descripción"
        name="descripcion"
        defaultValue={v?.descripcion ?? valoresIniciales?.descripcion ?? undefined}
        placeholder="Ej: Salario quincenal, riego finca La Loma..."
        required
      />

      <Field
        label="Monto pagado (USD)"
        name="monto"
        type="number"
        min={0}
        step="0.01"
        value={montoTexto}
        onChange={(e) => cambiarMonto(e.target.value)}
        required
      />

      {esFijo && (
        <Field
          key={`bonificacion-${colaboradorSeleccionado}`}
          label="Bonificación (USD, opcional — no aplica CSS ni Seguro Educativo)"
          name="bonificacion"
          type="number"
          min={0}
          step="0.01"
          defaultValue={v?.bonificacion ?? valoresIniciales?.bonificacion ?? undefined}
        />
      )}

      {mostrarDeducciones && (
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="CSS (9.75%)"
            name="css"
            type="number"
            min={0}
            step="0.01"
            value={cssTexto}
            onChange={(e) => setCssTexto(e.target.value)}
          />
          <Field
            label="Seguro Educativo (1.25%)"
            name="seguroEducativo"
            type="number"
            min={0}
            step="0.01"
            value={seguroTexto}
            onChange={(e) => setSeguroTexto(e.target.value)}
          />
        </div>
      )}

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "Guardar pago"}</SubmitButton>
        <LinkButton href="/planilla/pagos" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
