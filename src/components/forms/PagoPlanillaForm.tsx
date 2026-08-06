"use client";

import { useActionState, useMemo, useState } from "react";
import { crearPagoAction, editarPagoAction } from "@/lib/actions/planilla";
import { obtenerResumenAsistenciaAction, type ResumenAsistencia } from "@/lib/actions/asistencia";
import { obtenerResumenControlHorarioAction, type ResumenControlHorario } from "@/lib/actions/controlHorario";
import { obtenerQuincenaDeFecha } from "@/lib/planilla";
import type { DetalleTalonarioCampo } from "@/lib/exportar";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { formatMoney, formatDateOnly } from "@/lib/format";

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
  bonificacion: number | null;
  aplicaDeducciones: boolean;
};

type DetalleDiaEditable = {
  fecha: string;
  rolDia: "operador" | "ayudante";
  tipoTrabajo: "oficina" | "proyecto";
  jornada: "completo" | "medio" | null;
  tipoProyecto: "ingenio_santa_rosa" | "particular" | null;
  hectareas: number | null;
  // Nombre del cliente del Informe de Campo que originó esta fila -- ayuda
  // a distinguir cuando hay más de un informe (más de un proyecto) el
  // mismo día para la misma persona.
  clienteInforme: string | null;
  // El cálculo llega como número, pero se guarda como texto para poder
  // editarlo a mano en el input -- "por cualquier cosa" (pedido del
  // usuario), sin dejar de sumar al total.
  monto: string;
};

// Cada fila del detalle corresponde a UN Informe de Campo (no a un día) --
// si una persona trabajó en 2 proyectos el mismo día, hay 2 filas. Cubre
// también los casos sin datos suficientes para calcular (sin Informe de
// Campo asociado, o un informe todavía sin clasificar Ingenio/Particular).
function descripcionDetalle(d: DetalleDiaEditable): string {
  if (d.tipoTrabajo === "oficina") {
    return `Oficina — ${d.jornada === "completo" ? "Día completo" : "Medio día"}`;
  }
  if (d.hectareas === null) {
    return "Proyecto — sin Informe de Campo ese día (monto a definir a mano)";
  }
  if (!d.tipoProyecto) {
    return `Proyecto — ${d.clienteInforme} (${d.hectareas} ha, informe sin clasificar Ingenio/Particular)`;
  }
  const tipo = d.tipoProyecto === "ingenio_santa_rosa" ? "Ingenio Santa Rosa" : "Trabajo Particular";
  return `Proyecto — ${tipo} · ${d.clienteInforme} (${d.hectareas} ha)`;
}

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
  // Foto del detalle guardada con el pago (planilla_pagos.detalle_calculo)
  // -- null en un pago histórico o en uno donde el monto se escribió a
  // mano sin usar "Calcular pago sugerido".
  detalleCalculo?: DetalleTalonarioCampo[] | null;
};

function calcularDeduccion(montoTexto: string, tasa: number): string {
  const monto = Number(montoTexto);
  if (!montoTexto || Number.isNaN(monto) || monto <= 0) return "";
  return String(Math.round(monto * tasa * 100) / 100);
}

// El salario (y la bonificación, si aplica) de un colaborador Fijo se
// guardan como monto MENSUAL en Colaboradores -- cada quincena paga la
// mitad (confirmado por el usuario, 2026-08-06, tras ver que "Calcular
// pago sugerido" mostraba el mensual completo como si fuera quincenal).
function mitadTexto(valorMensual: number | null): string {
  if (valorMensual === null) return "";
  return String(Math.round((valorMensual / 2) * 100) / 100);
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
        {
          nombre: valoresIniciales.colaborador,
          tipo: tipoInferido,
          salario: null,
          bonificacion: null,
          aplicaDeducciones: true,
        },
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
    const montoSugerido = !esEdicion && esFijoColab ? mitadTexto(colaborador!.salario) : "";
    const monto =
      v?.monto ?? (valoresIniciales?.monto != null ? String(valoresIniciales.monto) : montoSugerido);
    const cssHistorico = v?.css ?? (valoresIniciales?.css != null ? String(valoresIniciales.css) : null);
    const seguroHistorico =
      v?.seguroEducativo ?? (valoresIniciales?.seguroEducativo != null ? String(valoresIniciales.seguroEducativo) : null);
    const css = cssHistorico ?? (esFijoColab ? calcularDeduccion(monto, TASA_CSS) : "");
    const seguroEducativo = seguroHistorico ?? (esFijoColab ? calcularDeduccion(monto, TASA_SEGURO_EDUCATIVO) : "");
    const bonificacionSugerida = !esEdicion && esFijoColab ? mitadTexto(colaborador!.bonificacion) : "";
    const bonificacion =
      v?.bonificacion ??
      (valoresIniciales?.bonificacion != null ? String(valoresIniciales.bonificacion) : bonificacionSugerida);
    return { monto, css, seguroEducativo, bonificacion };
  }

  const fechaHastaInicial = v?.fecha ?? valoresIniciales?.fecha ?? fechaHoy;
  const fechaDesdeInicial = v?.fechaDesde ?? valoresIniciales?.fechaDesde ?? "";

  // De dónde sale el detalle con el que arranca la tabla editable: si ya se
  // intentó enviar el formulario (v, tras un error de validación en otro
  // campo) se restaura tal cual lo que el jefe ya tenía armado -- viaja
  // como JSON de texto porque es lo que manda el <input type="hidden">. Si
  // no, y se está editando un pago que ya tenía un detalle guardado, se
  // parte de esa foto. Si ninguno aplica (pago nuevo, o uno viejo sin
  // detalle guardado), arranca vacío -- el jefe usa "Calcular pago
  // sugerido" para llenarlo.
  function detalleInicial(): DetalleDiaEditable[] {
    if (v?.detalleCalculo) {
      try {
        const parsed = JSON.parse(v.detalleCalculo);
        if (Array.isArray(parsed)) {
          return (parsed as DetalleTalonarioCampo[]).map((d) => ({ ...d, monto: String(d.monto) }));
        }
      } catch {
        // JSON corrupto -- se ignora, cae al siguiente caso.
      }
    }
    if (valoresIniciales?.detalleCalculo) {
      return valoresIniciales.detalleCalculo.map((d) => ({ ...d, monto: String(d.monto) }));
    }
    return [];
  }

  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(colaboradorInicial);
  const [montoTexto, setMontoTexto] = useState(() => datosIniciales(colaboradorInicial).monto);
  const [cssTexto, setCssTexto] = useState(() => datosIniciales(colaboradorInicial).css);
  const [seguroTexto, setSeguroTexto] = useState(() => datosIniciales(colaboradorInicial).seguroEducativo);
  const [bonifTexto, setBonifTexto] = useState(() => datosIniciales(colaboradorInicial).bonificacion);
  const [fechaDesdeTexto, setFechaDesdeTexto] = useState(fechaDesdeInicial);
  const [fechaHastaTexto, setFechaHastaTexto] = useState(fechaHastaInicial);
  const [resumenAsistencia, setResumenAsistencia] = useState<ResumenAsistencia | null>(null);
  const [detalleAsistencia, setDetalleAsistencia] = useState<DetalleDiaEditable[]>(detalleInicial);
  const [buscandoResumen, setBuscandoResumen] = useState(false);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);
  // Descuento por ausencias de un colaborador Fijo (Control de Horario) --
  // independiente del resumen de Asistencia de arriba, que es solo para
  // Campo. La quincena se calcula a partir de la fecha elegida en el
  // formulario, no de la fecha de hoy.
  const [resumenControlHorario, setResumenControlHorario] = useState<ResumenControlHorario | null>(null);
  const [etiquetaQuincenaFijo, setEtiquetaQuincenaFijo] = useState<string | null>(null);

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    const iniciales = datosIniciales(colaboradorInicial);
    setColaboradorSeleccionado(colaboradorInicial);
    setMontoTexto(iniciales.monto);
    setCssTexto(iniciales.css);
    setSeguroTexto(iniciales.seguroEducativo);
    setBonifTexto(iniciales.bonificacion);
    setFechaDesdeTexto(fechaDesdeInicial);
    setFechaHastaTexto(fechaHastaInicial);
    setResumenAsistencia(null);
    setDetalleAsistencia(detalleInicial());
    setResumenControlHorario(null);
    setEtiquetaQuincenaFijo(null);
    setErrorResumen(null);
  }

  function cambiarColaborador(nombre: string) {
    setColaboradorSeleccionado(nombre);
    const iniciales = datosIniciales(nombre);
    setMontoTexto(iniciales.monto);
    setCssTexto(iniciales.css);
    setSeguroTexto(iniciales.seguroEducativo);
    setBonifTexto(iniciales.bonificacion);
    setFechaDesdeTexto(fechaDesdeInicial);
    setFechaHastaTexto(fechaHastaInicial);
    setResumenAsistencia(null);
    setDetalleAsistencia([]);
    setResumenControlHorario(null);
    setEtiquetaQuincenaFijo(null);
    setErrorResumen(null);
  }

  // El monto se pre-llena con el cálculo sugerido, pero sigue totalmente
  // editable después -- el jefe puede ajustarlo a mano si hace falta,
  // nunca se guarda sin que él lo confirme. Lo mismo aplica a cada día del
  // detalle (pedido del usuario): se puede ajustar uno solo por cualquier
  // motivo, y el total (y el campo Monto) se recalcula sumando lo que
  // quede en cada fila, ya editada o no.
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
      setDetalleAsistencia(resultado.detalle.map((d) => ({ ...d, monto: String(d.monto) })));
      setMontoTexto(String(resultado.totalSugerido));
    } catch (err) {
      setErrorResumen(err instanceof Error ? err.message : "No se pudo consultar la asistencia.");
    } finally {
      setBuscandoResumen(false);
    }
  }

  // Descuenta del salario base los días marcados "No" en Control de
  // Horario dentro de la quincena a la que pertenece la fecha elegida --
  // el resultado pre-llena Monto (y, con él, CSS/Seguro Educativo se
  // recalculan solos vía cambiarMonto), pero todo sigue editable después.
  async function verResumenControlHorario() {
    if (!colaboradorActual || colaboradorActual.salario == null) return;
    const quincena = obtenerQuincenaDeFecha(fechaHastaTexto);
    const salarioQuincenal = Number(mitadTexto(colaboradorActual.salario));
    setBuscandoResumen(true);
    setErrorResumen(null);
    try {
      const resultado = await obtenerResumenControlHorarioAction(
        colaboradorSeleccionado,
        quincena.fechaDesde,
        quincena.fechaHasta,
        salarioQuincenal,
      );
      setResumenControlHorario(resultado);
      setEtiquetaQuincenaFijo(quincena.etiqueta);
      cambiarMonto(String(resultado.totalSugerido));
      setBonifTexto(mitadTexto(colaboradorActual.bonificacion));
    } catch (err) {
      setErrorResumen(err instanceof Error ? err.message : "No se pudo consultar el control de horario.");
    } finally {
      setBuscandoResumen(false);
    }
  }

  function actualizarMontoDetalle(index: number, valor: string) {
    const nuevoDetalle = detalleAsistencia.map((d, i) => (i === index ? { ...d, monto: valor } : d));
    setDetalleAsistencia(nuevoDetalle);
    const total = nuevoDetalle.reduce((s, d) => s + (Number(d.monto) || 0), 0);
    setMontoTexto(String(Math.round(total * 100) / 100));
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
      <input
        type="hidden"
        name="detalleCalculo"
        value={JSON.stringify(
          detalleAsistencia.map((d) => ({
            fecha: d.fecha,
            rolDia: d.rolDia,
            tipoTrabajo: d.tipoTrabajo,
            jornada: d.jornada,
            tipoProyecto: d.tipoProyecto,
            hectareas: d.hectareas,
            clienteInforme: d.clienteInforme,
            monto: Number(d.monto) || 0,
          })),
        )}
      />

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
                setDetalleAsistencia([]);
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
                setDetalleAsistencia([]);
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
                    <strong>
                      {formatMoney(detalleAsistencia.reduce((s, d) => s + (Number(d.monto) || 0), 0))}
                    </strong>{" "}
                    ({resumenAsistencia.diasOficina} día(s) Oficina, {resumenAsistencia.diasProyecto} día(s)
                    Proyecto con {resumenAsistencia.hectareasProyecto} hectáreas)
                  </>
                )}
              </p>
            )}
            {detalleAsistencia.length > 0 && (
              <>
                {!resumenAsistencia && (
                  <p className="mt-2 text-sm text-green-800/80 dark:text-green-200/80">
                    Detalle guardado con este pago:
                  </p>
                )}
                <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[460px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-green-100 uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                          <th className="px-2 py-1 font-medium">Fecha</th>
                          <th className="px-2 py-1 font-medium">Rol</th>
                          <th className="px-2 py-1 font-medium">Detalle</th>
                          <th className="px-2 py-1 font-medium">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleAsistencia.map((d, i) => (
                          <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                            <td className="px-2 py-1 text-green-800/80 dark:text-green-200/80">
                              {formatDateOnly(d.fecha)}
                            </td>
                            <td className="px-2 py-1 text-green-800/80 dark:text-green-200/80">
                              {d.rolDia === "operador" ? "Operador" : "Ayudante"}
                            </td>
                            <td className="px-2 py-1 text-green-800/80 dark:text-green-200/80">
                              {descripcionDetalle(d)}
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={d.monto}
                                onChange={(e) => actualizarMontoDetalle(i, e.target.value)}
                                className="w-24 rounded-md border border-green-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-1 text-[11px] text-green-700/60 dark:text-green-300/60">
                      Cada monto se puede ajustar a mano -- el campo &quot;Monto pagado&quot; de abajo se recalcula sumando
                      esta tabla.
                    </p>
                  </div>
              </>
            )}
          </div>
        </div>
      ) : esFijo ? (
        <div className="flex flex-col gap-3">
          <Field
            label="Fecha"
            name="fecha"
            type="date"
            value={fechaHastaTexto}
            onChange={(e) => {
              setFechaHastaTexto(e.target.value);
              setResumenControlHorario(null);
              setEtiquetaQuincenaFijo(null);
            }}
            required
          />
          <div className="rounded-lg border border-green-100 p-3 dark:border-green-900/40">
            <button
              type="button"
              onClick={verResumenControlHorario}
              disabled={buscandoResumen || !colaboradorSeleccionado || colaboradorActual?.salario == null}
              className="rounded-lg border border-green-300 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-950/40"
            >
              {buscandoResumen ? "Calculando..." : "Calcular pago sugerido"}
            </button>
            {colaboradorActual?.salario == null && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Este colaborador no tiene un salario guardado en Colaboradores.
              </p>
            )}
            {errorResumen && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorResumen}</p>}
            {resumenControlHorario && etiquetaQuincenaFijo && (
              <p className="mt-2 text-sm text-green-800/80 dark:text-green-200/80">
                Quincena del {etiquetaQuincenaFijo} — {resumenControlHorario.diasAusentes} día(s) de ausencia
                marcados en Control de Horario sobre {resumenControlHorario.diasEsperados} esperados.
                {resumenControlHorario.diasAusentes > 0 && (
                  <>
                    {" "}
                    Descuento: <strong>{formatMoney(resumenControlHorario.totalDescuento)}</strong>.
                  </>
                )}{" "}
                Salario sugerido: <strong>{formatMoney(resumenControlHorario.totalSugerido)}</strong>
                {Number(bonifTexto) > 0 && (
                  <>
                    {" "}
                    + Bonificación: <strong>{formatMoney(Number(bonifTexto))}</strong> (sin descuento)
                  </>
                )}
                . Total del pago:{" "}
                <strong>{formatMoney(resumenControlHorario.totalSugerido + (Number(bonifTexto) || 0))}</strong>.
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
          label="Bonificación (USD, opcional — no aplica CSS ni Seguro Educativo)"
          name="bonificacion"
          type="number"
          min={0}
          step="0.01"
          value={bonifTexto}
          onChange={(e) => setBonifTexto(e.target.value)}
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

      {esFijo && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
          <p className="text-sm text-green-900 dark:text-green-100">
            Total a pagar:{" "}
            <strong className="text-base">
              {formatMoney(
                Math.round(
                  ((Number(montoTexto) || 0) +
                    (Number(bonifTexto) || 0) -
                    (Number(cssTexto) || 0) -
                    (Number(seguroTexto) || 0)) *
                    100,
                ) / 100,
              )}
            </strong>
          </p>
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
