"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import {
  crearInformeProyectoAction,
  editarInformeProyectoAction,
  buscarViaticosCajaMenudaAction,
  obtenerDatosProyectoAction,
} from "@/lib/actions/proyectos";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { CATEGORIAS_GASTO_OPERATIVO } from "@/lib/proyectoGastos";

const CLASE_INPUT =
  "w-full rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

// Campo de solo lectura: valores que se calculan solos (Cliente, Hectáreas,
// Total) a partir del Proyecto elegido -- nunca se escriben a mano.
function CampoLectura({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
      {label}
      <p className="rounded-lg border border-green-100 bg-green-50/60 px-3 py-2 text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-200">
        {valor}
      </p>
    </div>
  );
}

type FilaDraft = { drone: string; hectareas: string; precio: string };

function filaVacia(): FilaDraft {
  return { drone: "", hectareas: "", precio: "" };
}

type ItemGastoDraft = { categoria: string; cantidad: string; precio: string };
type BloqueGastoDraft = { drone: string; operador: string; ayudantes: string[]; items: ItemGastoDraft[] };

function bloqueGastoVacio(): BloqueGastoDraft {
  return {
    drone: "",
    operador: "",
    ayudantes: [],
    items: CATEGORIAS_GASTO_OPERATIVO.map((c) => ({ categoria: c.valor, cantidad: "", precio: "" })),
  };
}

export type ProyectoOpcion = { id: string; codigo: string; nombre: string; clienteNombre: string };

export type ValoresInforme = {
  id: string;
  proyectoId: string;
  cliente: string;
  ubicacion: string | null;
  hectareas: number | null;
  precio: number | null;
  total: number | null;
  fechaDesde: string;
  fechaHasta: string;
  filas: { drone: string; hectareas: number; precio: number }[];
  gastosOperativos: {
    drone: string;
    operador: string | null;
    ayudantes: string[];
    items: { categoria: string; cantidad: number; precio: number }[];
  }[];
};

function bloqueDesdeInicial(inicial: ValoresInforme["gastosOperativos"][number]): BloqueGastoDraft {
  return {
    drone: inicial.drone,
    operador: inicial.operador ?? "",
    ayudantes: inicial.ayudantes.length > 0 ? inicial.ayudantes : [],
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
  colaboradoresCampo = [],
  proyectos,
  valoresIniciales,
}: {
  fechaHoy: string;
  fechaHastaSugerida: string;
  colaboradoresCampo?: string[];
  proyectos: ProyectoOpcion[];
  valoresIniciales?: ValoresInforme;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarInformeProyectoAction : crearInformeProyectoAction,
    { error: null },
  );

  const v = state.values;

  const [proyectoId, setProyectoId] = useState(v?.proyectoId ?? valoresIniciales?.proyectoId ?? "");
  const [cliente, setCliente] = useState(valoresIniciales?.cliente ?? "");
  const [hectareas, setHectareas] = useState<number | null>(valoresIniciales?.hectareas ?? null);
  const [precio, setPrecio] = useState(String(v?.precio ?? valoresIniciales?.precio ?? ""));
  const [cargandoProyecto, setCargandoProyecto] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(v?.fechaDesde ?? valoresIniciales?.fechaDesde ?? fechaHoy);
  const [fechaHasta, setFechaHasta] = useState(
    v?.fechaHasta ?? valoresIniciales?.fechaHasta ?? fechaHastaSugerida,
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    setProyectoId(state.values?.proyectoId ?? "");
    setPrecio(String(state.values?.precio ?? ""));
    setFechaDesde(state.values?.fechaDesde ?? fechaHoy);
    setFechaHasta(state.values?.fechaHasta ?? fechaHastaSugerida);
  }

  // Al elegir (o cambiar) el Proyecto se cargan solos el Cliente y las
  // Hectáreas (suma de parcelas de los Informes de Campo de ese Proyecto) --
  // el servidor vuelve a calcular estos mismos valores al guardar, esto es
  // solo la vista previa.
  useEffect(() => {
    if (!proyectoId) {
      setCliente("");
      setHectareas(null);
      return;
    }
    let cancelado = false;
    setCargandoProyecto(true);
    obtenerDatosProyectoAction(proyectoId)
      .then((datos) => {
        if (cancelado) return;
        setCliente(datos.cliente);
        setHectareas(datos.hectareas);
      })
      .catch(() => {
        if (cancelado) return;
        setCliente("—");
        setHectareas(null);
      })
      .finally(() => {
        if (!cancelado) setCargandoProyecto(false);
      });
    return () => {
      cancelado = true;
    };
  }, [proyectoId]);

  const total = (hectareas ?? 0) * (Number(precio) || 0);

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

  const [mensajeViaticos, setMensajeViaticos] = useState<Record<number, string>>({});
  const [buscandoViaticos, setBuscandoViaticos] = useState<Record<number, boolean>>({});

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
    setMensajeViaticos((prev) => {
      const siguiente = { ...prev };
      delete siguiente[index];
      return siguiente;
    });
  }

  function actualizarNombreDrone(bloqueIndex: number, valor: string) {
    setGastosOperativos((prev) => prev.map((b, i) => (i === bloqueIndex ? { ...b, drone: valor } : b)));
  }

  function actualizarOperador(bloqueIndex: number, valor: string) {
    setGastosOperativos((prev) => prev.map((b, i) => (i === bloqueIndex ? { ...b, operador: valor } : b)));
  }

  function agregarAyudante(bloqueIndex: number) {
    setGastosOperativos((prev) =>
      prev.map((b, i) => (i === bloqueIndex ? { ...b, ayudantes: [...b.ayudantes, ""] } : b)),
    );
  }

  function actualizarAyudante(bloqueIndex: number, ayudanteIndex: number, valor: string) {
    setGastosOperativos((prev) =>
      prev.map((b, i) =>
        i !== bloqueIndex
          ? b
          : { ...b, ayudantes: b.ayudantes.map((a, j) => (j === ayudanteIndex ? valor : a)) },
      ),
    );
  }

  function quitarAyudante(bloqueIndex: number, ayudanteIndex: number) {
    setGastosOperativos((prev) =>
      prev.map((b, i) => (i === bloqueIndex ? { ...b, ayudantes: b.ayudantes.filter((_, j) => j !== ayudanteIndex) } : b)),
    );
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

  function llenarCategoria(bloqueIndex: number, categoria: string, total: number) {
    setGastosOperativos((prev) =>
      prev.map((b, i) =>
        i !== bloqueIndex
          ? b
          : {
              ...b,
              items: b.items.map((it) =>
                it.categoria === categoria ? { ...it, cantidad: "1", precio: String(total) } : it,
              ),
            },
      ),
    );
  }

  // Junta al Operador + Ayudantes del bloque en un solo equipo, para buscar
  // pagos/movimientos de cualquiera de ellos (el gasto lo hace todo el
  // equipo de campo, no una sola persona -- pedido explícito del usuario).
  function equipoDelBloque(bloqueIndex: number): string[] {
    const bloque = gastosOperativos[bloqueIndex];
    if (!bloque) return [];
    return [bloque.operador, ...bloque.ayudantes].filter((n) => n.trim() !== "");
  }

  // Busca en tiempo real en el servidor (nunca en una lista cargada al abrir
  // la página) -- así funciona sin importar si el movimiento de Caja Menuda
  // se registró antes o después de abrir este formulario. Categoría
  // "Viáticos", fecha dentro de la semana, el Concepto CONTENIDO en el
  // nombre del Cliente del Proyecto elegido (no exacto -- pedido explícito
  // del usuario, ya que el Concepto suele traer texto extra, ej. "Ingenio
  // Santa Rosa" encaja dentro de un Concepto "Ingenio Santa Rosa - comida
  // cuadrilla"), y (si se dio) el "Nombre" del movimiento (a quién se le
  // entregó el dinero) debe ser alguien del Equipo de Campo. El resultado
  // sigue siendo editable a mano después.
  async function traerDeCajaMenuda(bloqueIndex: number) {
    setBuscandoViaticos((prev) => ({ ...prev, [bloqueIndex]: true }));
    try {
      const equipo = equipoDelBloque(bloqueIndex);
      const { total, cantidad } = await buscarViaticosCajaMenudaAction(cliente, fechaDesde, fechaHasta, equipo);
      llenarCategoria(bloqueIndex, "viaticos", total);
      setMensajeViaticos((prev) => ({
        ...prev,
        [bloqueIndex]:
          cantidad > 0
            ? `${cantidad} movimiento${cantidad === 1 ? "" : "s"} de Caja Menuda encontrado${cantidad === 1 ? "" : "s"}, total ${formatMoney(total)}`
            : "No se encontraron movimientos de Caja Menuda que coincidan (revisa que el Concepto mencione el nombre del proyecto)",
      }));
    } catch (err) {
      setMensajeViaticos((prev) => ({
        ...prev,
        [bloqueIndex]: err instanceof Error ? err.message : "No se pudo buscar en Caja Menuda. Intenta de nuevo.",
      }));
    } finally {
      setBuscandoViaticos((prev) => ({ ...prev, [bloqueIndex]: false }));
    }
  }

  const filasParaEnviar = filas.map((f) => ({
    drone: f.drone,
    hectareas: Number(f.hectareas) || 0,
    precio: Number(f.precio) || 0,
  }));

  const gastosOperativosParaEnviar = gastosOperativos.map((b) => ({
    drone: b.drone,
    operador: b.operador,
    ayudantes: b.ayudantes.map((a) => a.trim()).filter((a) => a !== ""),
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
          <SelectField
            label="Proyecto"
            name="proyectoId"
            value={proyectoId}
            onChange={(e) => setProyectoId(e.target.value)}
            required
          >
            <option value="">Selecciona...</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} — {p.nombre} ({p.clienteNombre})
              </option>
            ))}
          </SelectField>
        </div>
        <CampoLectura label="Cliente" valor={cargandoProyecto ? "Cargando..." : cliente || "—"} />
        <CampoLectura
          label="Hectáreas"
          valor={cargandoProyecto ? "Cargando..." : hectareas !== null ? String(hectareas) : "—"}
        />
        <div className="sm:col-span-2">
          <Field
            label="Ubicación"
            name="ubicacion"
            defaultValue={v?.ubicacion ?? valoresIniciales?.ubicacion ?? undefined}
            placeholder="Ej. El Roble, Aguadulce"
          />
        </div>
        <Field
          label="Precio"
          name="precio"
          type="number"
          step="0.01"
          min="0"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />
        <CampoLectura label="Total" valor={formatMoney(total)} />
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
                  Drone
                  <input
                    value={bloque.drone}
                    onChange={(e) => actualizarNombreDrone(bi, e.target.value)}
                    placeholder="Ej. AGRO SKY 1"
                    className={`${CLASE_INPUT} max-w-xs`}
                  />
                </label>

                <div className="rounded-lg border border-green-100 p-3 dark:border-green-900/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Equipo de Campo
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <SelectField
                      label="Operador"
                      name={`operador-${bi}`}
                      defaultValue={bloque.operador}
                      onChange={(e) => actualizarOperador(bi, e.target.value)}
                    >
                      <option value="">Selecciona...</option>
                      {colaboradoresCampo.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </SelectField>
                    {bloque.ayudantes.map((ayudante, ai) => (
                      <div key={ai} className="flex items-end gap-1">
                        <SelectField
                          label={`Ayudante ${ai + 1}`}
                          name={`ayudante-${bi}-${ai}`}
                          defaultValue={ayudante}
                          onChange={(e) => actualizarAyudante(bi, ai, e.target.value)}
                        >
                          <option value="">Selecciona...</option>
                          {colaboradoresCampo.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </SelectField>
                        <button
                          type="button"
                          onClick={() => quitarAyudante(bi, ai)}
                          className="pb-2 text-sm text-red-600 hover:underline dark:text-red-400"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => agregarAyudante(bi)}
                    className="mt-2 rounded-lg border border-green-200 px-3 py-1 text-xs text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
                  >
                    + Agregar ayudante
                  </button>
                </div>
              </div>
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
                          {item.categoria === "viaticos" && (
                            <button
                              type="button"
                              onClick={() => traerDeCajaMenuda(bi)}
                              disabled={buscandoViaticos[bi] || !cliente.trim()}
                              className="whitespace-nowrap text-sm text-green-700 hover:underline disabled:opacity-40 dark:text-green-300"
                            >
                              {buscandoViaticos[bi] ? "Buscando..." : "Traer de Caja Menuda"}
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

            {mensajeViaticos[bi] && (
              <p className="text-xs text-green-700/80 dark:text-green-300/80">{mensajeViaticos[bi]}</p>
            )}
          </div>
        );
      })}

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "Guardar informe"}</SubmitButton>
        <LinkButton
          href={esEdicion ? `/informes/proyecto/${valoresIniciales!.id}` : "/informes/proyecto"}
          variant="secondary"
        >
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
