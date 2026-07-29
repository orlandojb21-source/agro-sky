"use client";

import { useState } from "react";
import { useActionState } from "react";
import { crearInformeProyectoAction, editarInformeProyectoAction } from "@/lib/actions/proyectos";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { CATEGORIAS_GASTO_OPERATIVO } from "@/lib/proyectoGastos";

const CLASE_INPUT =
  "w-full rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

type FilaDraft = { drone: string; hectareas: string; precio: string };

function filaVacia(): FilaDraft {
  return { drone: "", hectareas: "", precio: "" };
}

type ItemGastoDraft = { categoria: string; cantidad: string; precio: string };
type BloqueGastoDraft = { drone: string; items: ItemGastoDraft[] };

function bloqueGastoVacio(): BloqueGastoDraft {
  return {
    drone: "",
    items: CATEGORIAS_GASTO_OPERATIVO.map((c) => ({ categoria: c.valor, cantidad: "", precio: "" })),
  };
}

export type PagoPlanillaProyecto = { descripcion: string; fecha: string; monto: number };

export type ValoresInforme = {
  id: string;
  proyecto: string;
  ubicacion: string | null;
  hectareas: number | null;
  precio: number | null;
  total: number | null;
  fechaDesde: string;
  fechaHasta: string;
  filas: { drone: string; hectareas: number; precio: number }[];
  gastosOperativos: { drone: string; items: { categoria: string; cantidad: number; precio: number }[] }[];
};

function bloqueDesdeInicial(inicial: ValoresInforme["gastosOperativos"][number]): BloqueGastoDraft {
  return {
    drone: inicial.drone,
    items: CATEGORIAS_GASTO_OPERATIVO.map((c) => {
      const encontrado = inicial.items.find((it) => it.categoria === c.valor);
      return {
        categoria: c.valor,
        cantidad: encontrado ? String(encontrado.cantidad) : "",
        precio: encontrado ? String(encontrado.precio) : "",
      };
    }),
  };
}

export function ProyectoInformeForm({
  fechaHoy,
  fechaHastaSugerida,
  pagosPlanillaProyecto = [],
  valoresIniciales,
}: {
  fechaHoy: string;
  fechaHastaSugerida: string;
  pagosPlanillaProyecto?: PagoPlanillaProyecto[];
  valoresIniciales?: ValoresInforme;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarInformeProyectoAction : crearInformeProyectoAction,
    { error: null },
  );

  const v = state.values;

  const [proyecto, setProyecto] = useState(v?.proyecto ?? valoresIniciales?.proyecto ?? "");
  const [fechaDesde, setFechaDesde] = useState(v?.fechaDesde ?? valoresIniciales?.fechaDesde ?? fechaHoy);
  const [fechaHasta, setFechaHasta] = useState(
    v?.fechaHasta ?? valoresIniciales?.fechaHasta ?? fechaHastaSugerida,
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    setProyecto(state.values?.proyecto ?? "");
    setFechaDesde(state.values?.fechaDesde ?? fechaHoy);
    setFechaHasta(state.values?.fechaHasta ?? fechaHastaSugerida);
  }

  const [filas, setFilas] = useState<FilaDraft[]>(() => {
    if (v?.filas) {
      try {
        const parsed = JSON.parse(v.filas) as FilaDraft[];
        if (parsed.length > 0) return parsed;
      } catch {
        // sigue abajo con los valores iniciales / fila vacía
      }
    }
    if (valoresIniciales?.filas && valoresIniciales.filas.length > 0) {
      return valoresIniciales.filas.map((f) => ({
        drone: f.drone,
        hectareas: String(f.hectareas),
        precio: String(f.precio),
      }));
    }
    return [filaVacia()];
  });

  const [gastosOperativos, setGastosOperativos] = useState<BloqueGastoDraft[]>(() => {
    if (v?.gastosOperativos) {
      try {
        return JSON.parse(v.gastosOperativos) as BloqueGastoDraft[];
      } catch {
        // sigue abajo con los valores iniciales / sin bloques
      }
    }
    if (valoresIniciales?.gastosOperativos) {
      return valoresIniciales.gastosOperativos.map(bloqueDesdeInicial);
    }
    return [];
  });

  const [mensajePlanilla, setMensajePlanilla] = useState<Record<number, string>>({});

  function actualizarFila(index: number, campo: keyof FilaDraft, valor: string) {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, [campo]: valor } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  function quitarFila(index: number) {
    setFilas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function agregarBloqueGasto() {
    setGastosOperativos((prev) => [...prev, bloqueGastoVacio()]);
  }

  function quitarBloqueGasto(index: number) {
    setGastosOperativos((prev) => prev.filter((_, i) => i !== index));
    setMensajePlanilla((prev) => {
      const siguiente = { ...prev };
      delete siguiente[index];
      return siguiente;
    });
  }

  function actualizarNombreDrone(bloqueIndex: number, valor: string) {
    setGastosOperativos((prev) => prev.map((b, i) => (i === bloqueIndex ? { ...b, drone: valor } : b)));
  }

  function actualizarItemGasto(
    bloqueIndex: number,
    itemIndex: number,
    campo: "cantidad" | "precio",
    valor: string,
  ) {
    setGastosOperativos((prev) =>
      prev.map((b, i) =>
        i !== bloqueIndex
          ? b
          : { ...b, items: b.items.map((it, j) => (j === itemIndex ? { ...it, [campo]: valor } : it)) },
      ),
    );
  }

  // Trae de planilla_pagos reales la suma de lo pagado para este proyecto:
  // tipo_trabajo = 'proyecto' (ya filtrado al armar pagosPlanillaProyecto),
  // fecha dentro de la semana del informe, y la Descripción del pago
  // coincide EXACTAMENTE con el nombre del proyecto -- los 3 criterios que
  // pidió el usuario. El resultado se sugiere pero se puede corregir a mano
  // después, igual que el CSS/Seguro Educativo de Planilla.
  function traerDePlanilla(bloqueIndex: number) {
    const nombreProyecto = proyecto.trim();
    const coincidencias = pagosPlanillaProyecto.filter(
      (p) => p.descripcion.trim() === nombreProyecto && p.fecha >= fechaDesde && p.fecha <= fechaHasta,
    );
    const total = coincidencias.reduce((s, p) => s + p.monto, 0);

    setGastosOperativos((prev) =>
      prev.map((b, i) =>
        i !== bloqueIndex
          ? b
          : {
              ...b,
              items: b.items.map((it) =>
                it.categoria === "planilla" ? { ...it, cantidad: "1", precio: String(total) } : it,
              ),
            },
      ),
    );
    setMensajePlanilla((prev) => ({
      ...prev,
      [bloqueIndex]:
        coincidencias.length > 0
          ? `${coincidencias.length} pago${coincidencias.length === 1 ? "" : "s"} de planilla encontrado${coincidencias.length === 1 ? "" : "s"}, total ${formatMoney(total)}`
          : "No se encontraron pagos de planilla que coincidan (revisa que el nombre del proyecto sea idéntico al de la Descripción del pago)",
    }));
  }

  const filasParaEnviar = filas.map((f) => ({
    drone: f.drone,
    hectareas: Number(f.hectareas) || 0,
    precio: Number(f.precio) || 0,
  }));

  const gastosOperativosParaEnviar = gastosOperativos.map((b) => ({
    drone: b.drone,
    items: b.items.map((it) => ({
      categoria: it.categoria,
      cantidad: Number(it.cantidad) || 0,
      precio: Number(it.precio) || 0,
    })),
  }));

  return (
    <form key={remountKey} action={formAction} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="filas" value={JSON.stringify(filasParaEnviar)} />
      <input type="hidden" name="gastosOperativos" value={JSON.stringify(gastosOperativosParaEnviar)} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      <div className="grid max-w-2xl grid-cols-1 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <div className="sm:col-span-2">
          <Field
            label="Proyecto"
            name="proyecto"
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            placeholder="Ej. Ingenio Santa Rosa (Semana 8 Granulado)"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Ubicación"
            name="ubicacion"
            defaultValue={v?.ubicacion ?? valoresIniciales?.ubicacion ?? undefined}
            placeholder="Ej. El Roble, Aguadulce"
          />
        </div>
        <Field
          label="Hectáreas"
          name="hectareas"
          type="number"
          step="0.01"
          min="0"
          defaultValue={v?.hectareas ?? valoresIniciales?.hectareas ?? undefined}
        />
        <Field
          label="Precio"
          name="precio"
          type="number"
          step="0.01"
          min="0"
          defaultValue={v?.precio ?? valoresIniciales?.precio ?? undefined}
        />
        <Field
          label="Total"
          name="total"
          type="number"
          step="0.01"
          min="0"
          defaultValue={v?.total ?? valoresIniciales?.total ?? undefined}
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

      <button
        type="button"
        onClick={agregarBloqueGasto}
        className="self-start rounded-lg border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
      >
        + Agregar Gastos operativos
      </button>

      {gastosOperativos.map((bloque, bi) => {
        const totalBloque = bloque.items.reduce(
          (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio) || 0),
          0,
        );
        return (
          <div
            key={bi}
            className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex flex-1 flex-col gap-1 text-sm text-green-900 dark:text-green-100">
                Drone
                <input
                  value={bloque.drone}
                  onChange={(e) => actualizarNombreDrone(bi, e.target.value)}
                  placeholder="Ej. AGRO SKY 1"
                  className={`${CLASE_INPUT} max-w-xs`}
                />
              </label>
              <button
                type="button"
                onClick={() => quitarBloqueGasto(bi)}
                className="text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Quitar bloque
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                    <th className="px-2 py-2 font-medium">Categoría</th>
                    <th className="px-2 py-2 font-medium">Cantidad</th>
                    <th className="px-2 py-2 font-medium">Precio unitario</th>
                    <th className="px-2 py-2 font-medium">Total</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {bloque.items.map((item, ii) => {
                    const totalItem = (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
                    const etiqueta = CATEGORIAS_GASTO_OPERATIVO.find((c) => c.valor === item.categoria)!.etiqueta;
                    return (
                      <tr key={item.categoria} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                        <td className="px-2 py-2 text-green-900 dark:text-green-50">{etiqueta}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.cantidad}
                            onChange={(e) => actualizarItemGasto(bi, ii, "cantidad", e.target.value)}
                            className={CLASE_INPUT}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.precio}
                            onChange={(e) => actualizarItemGasto(bi, ii, "precio", e.target.value)}
                            className={CLASE_INPUT}
                          />
                        </td>
                        <td className="px-2 py-2 font-medium text-green-900 dark:text-green-50">
                          {formatMoney(totalItem)}
                        </td>
                        <td className="px-2 py-2">
                          {item.categoria === "planilla" && (
                            <button
                              type="button"
                              onClick={() => traerDePlanilla(bi)}
                              className="whitespace-nowrap text-sm text-green-700 hover:underline dark:text-green-300"
                            >
                              Traer de Planilla
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                    <td className="px-2 py-2 text-green-900 dark:text-green-50" colSpan={3}>
                      total
                    </td>
                    <td className="px-2 py-2 text-green-700 dark:text-green-400" colSpan={2}>
                      {formatMoney(totalBloque)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {mensajePlanilla[bi] && (
              <p className="text-xs text-green-700/80 dark:text-green-300/80">{mensajePlanilla[bi]}</p>
            )}
          </div>
        );
      })}

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "Guardar informe"}</SubmitButton>
        <LinkButton href={esEdicion ? `/proyectos/${valoresIniciales!.id}` : "/proyectos"} variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
