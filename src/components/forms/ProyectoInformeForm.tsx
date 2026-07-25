"use client";

import { useActionState, useState } from "react";
import { crearInformeProyectoAction } from "@/lib/actions/proyectos";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import {
  SLOTS_OPERACION,
  ETIQUETA_SLOT,
  GASTOS_OPERACION,
  type SlotOperacion,
} from "@/lib/proyectos";
import { PersonalDiasGrid, type PersonalDraft } from "@/components/forms/PersonalDiasGrid";

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

type TramoDraft = { hectareas: number; precio: number };

type OperacionDraft = {
  slot: SlotOperacion;
  operador: string;
  diesel: number;
  gasolina: number;
  viaticos: number;
  planilla: number;
  alquilerDrone: number;
  alquilerCarro: number;
  lavadoCarro: number;
  tramos: TramoDraft[];
};

function operacionesVacias(): OperacionDraft[] {
  return SLOTS_OPERACION.map((slot) => ({
    slot,
    operador: "",
    diesel: 0,
    gasolina: 0,
    viaticos: 0,
    planilla: 0,
    alquilerDrone: 0,
    alquilerCarro: 0,
    lavadoCarro: 0,
    tramos: [],
  }));
}

function totalesOperacion(op: OperacionDraft) {
  const hectareas = op.tramos.reduce((s, t) => s + t.hectareas, 0);
  const monto = op.tramos.reduce((s, t) => s + t.hectareas * t.precio, 0);
  const gastos =
    op.diesel + op.gasolina + op.viaticos + op.planilla + op.alquilerDrone + op.alquilerCarro + op.lavadoCarro;
  const ganancia = monto - gastos;
  return { hectareas, monto, gastos, ganancia };
}

function OperacionCard({
  operacion,
  onChange,
}: {
  operacion: OperacionDraft;
  onChange: (siguiente: OperacionDraft) => void;
}) {
  const [hectareasDraft, setHectareasDraft] = useState("");
  const [precioDraft, setPrecioDraft] = useState("");
  const totales = totalesOperacion(operacion);

  function agregarTramo() {
    const hectareas = Number(hectareasDraft);
    const precio = Number(precioDraft);
    if (!hectareas || hectareas <= 0 || Number.isNaN(precio) || precio < 0) return;
    onChange({ ...operacion, tramos: [...operacion.tramos, { hectareas, precio }] });
    setHectareasDraft("");
    setPrecioDraft("");
  }

  function quitarTramo(index: number) {
    onChange({ ...operacion, tramos: operacion.tramos.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">
          {ETIQUETA_SLOT[operacion.slot]}
        </h2>
        <label className="flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
          Operador
          <input
            value={operacion.operador}
            onChange={(e) => onChange({ ...operacion, operador: e.target.value })}
            placeholder="Nombre (opcional)"
            className={CLASE_INPUT}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-green-900 dark:text-green-100">Hectáreas trabajadas</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-green-700/70 dark:text-green-300/70">
            Hectáreas
            <input
              type="number"
              min={0}
              step="0.01"
              value={hectareasDraft}
              onChange={(e) => setHectareasDraft(e.target.value)}
              className={`${CLASE_INPUT} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-green-700/70 dark:text-green-300/70">
            Precio por Ha
            <input
              type="number"
              min={0}
              step="0.01"
              value={precioDraft}
              onChange={(e) => setPrecioDraft(e.target.value)}
              className={`${CLASE_INPUT} w-28`}
            />
          </label>
          <button
            type="button"
            onClick={agregarTramo}
            disabled={!hectareasDraft}
            className="rounded-lg border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
          >
            + Agregar
          </button>
        </div>

        {operacion.tramos.length > 0 && (
          <table className="w-full max-w-md text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                <th className="py-1 font-medium">Hectáreas</th>
                <th className="py-1 font-medium">Precio</th>
                <th className="py-1 font-medium">Subtotal</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {operacion.tramos.map((t, i) => (
                <tr key={i} className="border-t border-green-50 dark:border-green-900/30">
                  <td className="py-1 text-green-800/80 dark:text-green-200/80">{t.hectareas}</td>
                  <td className="py-1 text-green-800/80 dark:text-green-200/80">{formatMoney(t.precio)}</td>
                  <td className="py-1 font-medium text-green-900 dark:text-green-50">
                    {formatMoney(t.hectareas * t.precio)}
                  </td>
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => quitarTramo(i)}
                      className="text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-green-900 dark:text-green-100">Gastos operativos</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GASTOS_OPERACION.map(({ campo, etiqueta }) => (
            <label
              key={campo}
              className="flex flex-col gap-1 text-xs text-green-700/70 dark:text-green-300/70"
            >
              {etiqueta}
              <input
                type="number"
                min={0}
                step="0.01"
                value={operacion[campo] || ""}
                onChange={(e) => onChange({ ...operacion, [campo]: Number(e.target.value) || 0 })}
                className={CLASE_INPUT}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-green-100 bg-green-50/60 p-3 text-sm sm:grid-cols-4 dark:border-green-900/40 dark:bg-green-950/20">
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Ha</p>
          <p className="font-medium text-green-900 dark:text-green-50">{totales.hectareas}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Monto</p>
          <p className="font-medium text-green-900 dark:text-green-50">{formatMoney(totales.monto)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Gastos</p>
          <p className="font-medium text-red-700 dark:text-red-400">{formatMoney(totales.gastos)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Ganancia</p>
          <p
            className={
              totales.ganancia >= 0
                ? "font-medium text-green-700 dark:text-green-400"
                : "font-medium text-red-700 dark:text-red-400"
            }
          >
            {formatMoney(totales.ganancia)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProyectoInformeForm({ fechaHoy, fechaHastaSugerida }: { fechaHoy: string; fechaHastaSugerida: string }) {
  const [state, formAction] = useActionState(crearInformeProyectoAction, { error: null });

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;

  const [fechaDesde, setFechaDesde] = useState(v?.fechaDesde ?? fechaHoy);
  const [fechaHasta, setFechaHasta] = useState(v?.fechaHasta ?? fechaHastaSugerida);

  const [operaciones, setOperaciones] = useState<OperacionDraft[]>(() => {
    if (!v?.operaciones) return operacionesVacias();
    try {
      const parsed = JSON.parse(v.operaciones) as OperacionDraft[];
      return parsed.length === SLOTS_OPERACION.length ? parsed : operacionesVacias();
    } catch {
      return operacionesVacias();
    }
  });

  const [personal, setPersonal] = useState<PersonalDraft[]>(() => {
    if (!v?.personal) return [];
    try {
      return JSON.parse(v.personal) as PersonalDraft[];
    } catch {
      return [];
    }
  });

  function actualizarOperacion(index: number, siguiente: OperacionDraft) {
    setOperaciones((prev) => prev.map((op, i) => (i === index ? siguiente : op)));
  }

  const totalesInforme = operaciones.reduce(
    (acc, op) => {
      const t = totalesOperacion(op);
      return {
        hectareas: acc.hectareas + t.hectareas,
        monto: acc.monto + t.monto,
        gastos: acc.gastos + t.gastos,
        ganancia: acc.ganancia + t.ganancia,
      };
    },
    { hectareas: 0, monto: 0, gastos: 0, ganancia: 0 },
  );

  return (
    <form key={remountKey} action={formAction} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="operaciones" value={JSON.stringify(operaciones)} />
      <input type="hidden" name="personal" value={JSON.stringify(personal)} />

      <div className="grid max-w-2xl grid-cols-1 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <div className="sm:col-span-2">
          <Field
            label="Proyecto"
            name="proyecto"
            defaultValue={v?.proyecto ?? undefined}
            placeholder="Ej. Ingenio Santa Rosa (Semana 8 Granulado)"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Field label="Ubicación (opcional)" name="ubicacion" defaultValue={v?.ubicacion ?? undefined} />
        </div>
        <Field
          label="Fecha desde"
          name="fechaDesde"
          type="date"
          defaultValue={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          required
        />
        <Field
          label="Fecha hasta"
          name="fechaHasta"
          type="date"
          defaultValue={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          required
        />
        <Field
          label="Precio de referencia (opcional)"
          name="precioReferencia"
          type="number"
          step="0.01"
          min="0"
          defaultValue={v?.precioReferencia ?? undefined}
        />
      </div>

      {operaciones.map((op, i) => (
        <OperacionCard key={op.slot} operacion={op} onChange={(siguiente) => actualizarOperacion(i, siguiente)} />
      ))}

      <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Personal por día</h2>
        <PersonalDiasGrid
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          personal={personal}
          onChange={setPersonal}
        />
      </div>

      <div className="ml-auto flex w-full max-w-xs flex-col gap-1 rounded-lg border border-green-100 bg-green-50/60 p-4 text-sm dark:border-green-900/40 dark:bg-green-950/20">
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">Hectáreas totales</span>
          <span className="text-green-900 dark:text-green-50">{totalesInforme.hectareas}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">Monto total</span>
          <span className="text-green-900 dark:text-green-50">{formatMoney(totalesInforme.monto)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">Gastos totales</span>
          <span className="text-red-700 dark:text-red-400">{formatMoney(totalesInforme.gastos)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-green-200/60 pt-1 font-semibold dark:border-green-800/60">
          <span className="text-green-900 dark:text-green-50">Ganancia</span>
          <span className="text-green-900 dark:text-green-50">{formatMoney(totalesInforme.ganancia)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <SubmitButton>Guardar informe</SubmitButton>
        <LinkButton href="/proyectos" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
