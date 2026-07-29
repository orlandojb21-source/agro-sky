"use client";

import { useState } from "react";
import { useActionState } from "react";
import { crearInformeProyectoAction } from "@/lib/actions/proyectos";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";

const CLASE_INPUT =
  "w-full rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

type FilaDraft = { drone: string; hectareas: string; precio: string };

function filaVacia(): FilaDraft {
  return { drone: "", hectareas: "", precio: "" };
}

export function ProyectoInformeForm({
  fechaHoy,
  fechaHastaSugerida,
}: {
  fechaHoy: string;
  fechaHastaSugerida: string;
}) {
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

  const [filas, setFilas] = useState<FilaDraft[]>(() => {
    if (!v?.filas) return [filaVacia()];
    try {
      const parsed = JSON.parse(v.filas) as FilaDraft[];
      return parsed.length > 0 ? parsed : [filaVacia()];
    } catch {
      return [filaVacia()];
    }
  });

  function actualizarFila(index: number, campo: keyof FilaDraft, valor: string) {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, [campo]: valor } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  function quitarFila(index: number) {
    setFilas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  const filasParaEnviar = filas.map((f) => ({
    drone: f.drone,
    hectareas: Number(f.hectareas) || 0,
    precio: Number(f.precio) || 0,
  }));

  return (
    <form key={remountKey} action={formAction} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="filas" value={JSON.stringify(filasParaEnviar)} />

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
          <Field label="Ubicación" name="ubicacion" defaultValue={v?.ubicacion ?? undefined} placeholder="Ej. El Roble, Aguadulce" />
        </div>
        <Field
          label="Hectáreas"
          name="hectareas"
          type="number"
          step="0.01"
          min="0"
          defaultValue={v?.hectareas ?? undefined}
        />
        <Field
          label="Precio"
          name="precio"
          type="number"
          step="0.01"
          min="0"
          defaultValue={v?.precio ?? undefined}
        />
        <Field
          label="Total"
          name="total"
          type="number"
          step="0.01"
          min="0"
          defaultValue={v?.total ?? undefined}
        />
        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
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
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                <th className="px-2 py-2 font-medium">Drone</th>
                <th className="px-2 py-2 font-medium">HA</th>
                <th className="px-2 py-2 font-medium">Precio</th>
                <th className="px-2 py-2 font-medium">Total</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const total = (Number(f.hectareas) || 0) * (Number(f.precio) || 0);
                return (
                  <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-2 py-2">
                      <input
                        value={f.drone}
                        onChange={(e) => actualizarFila(i, "drone", e.target.value)}
                        placeholder="Ej. AGRO SKY 1"
                        className={CLASE_INPUT}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={f.hectareas}
                        onChange={(e) => actualizarFila(i, "hectareas", e.target.value)}
                        className={CLASE_INPUT}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={f.precio}
                        onChange={(e) => actualizarFila(i, "precio", e.target.value)}
                        className={CLASE_INPUT}
                      />
                    </td>
                    <td className="px-2 py-2 font-medium text-green-900 dark:text-green-50">
                      {formatMoney(total)}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => quitarFila(i)}
                        disabled={filas.length === 1}
                        className="text-sm text-red-600 hover:underline disabled:opacity-30 dark:text-red-400"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={agregarFila}
          className="self-start rounded-lg border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          + Agregar fila
        </button>
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
