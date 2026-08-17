"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { crearInformeProyectoAction, editarInformeProyectoAction, obtenerDatosProyectoAction } from "@/lib/actions/proyectos";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { CATEGORIAS_GASTO_OPERATIVO, textoEquipoDeCampo, type GastoProyectoRegistrado } from "@/lib/proyectoGastos";

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

// Mismo formato que claveEquipo() en lib/actions/proyectos.ts -- así cada
// bloque se puede emparejar con su equipoKey al guardar.
function claveEquipo(operador: string, ayudantes: string[]): string {
  const ordenados = ayudantes.map((a) => a.trim()).filter((a) => a !== "").sort();
  return `${operador.trim()}||${ordenados.join(",")}`;
}

// Operador, Drone y Hectáreas son de solo lectura (una fila por Informe de
// Campo del Proyecto, ver obtenerDatosProyectoAction) -- solo el Precio se
// llena a mano, por fila.
type FilaDraft = { informeCampoId: string; operador: string; drone: string; hectareas: number; precio: string };

type ItemGastoDraft = { categoria: string; cantidad: string; precio: string };
// Un bloque por cada Operador+Ayudantes que aparezca en los Informes de
// Campo del Proyecto (ver obtenerDatosProyectoAction) -- no se agregan ni
// quitan bloques a mano.
type BloqueGastoDraft = { key: string; operador: string; ayudantes: string[]; items: ItemGastoDraft[] };
type BusquedaAuto = { cantidad: number; total: number };
type InfoAutoPorEquipo = Record<string, { viaticos: BusquedaAuto; planilla: BusquedaAuto }>;

// Viáticos (de Caja Menuda) y Planilla (calculada, ver
// obtenerDatosProyectoAction) se sugieren solos (cantidad 1, precio = el
// monto encontrado/calculado) cuando hay algo que sugerir y todavía no se
// había escrito nada a mano en esa categoría; el resto de categorías
// siempre arranca vacío. Si ya había un valor (edición, o tras reintentar
// por un error), ese valor se conserva.
function itemsAutoPara(equipo: { viaticos: BusquedaAuto; planilla: BusquedaAuto }, anteriores?: ItemGastoDraft[]): ItemGastoDraft[] {
  return CATEGORIAS_GASTO_OPERATIVO.map((c) => {
    const anterior = anteriores?.find((it) => it.categoria === c.valor);
    if (anterior) return anterior;
    if (c.valor === "viaticos" && equipo.viaticos.cantidad > 0) {
      return { categoria: c.valor, cantidad: "1", precio: String(equipo.viaticos.total) };
    }
    if (c.valor === "planilla" && equipo.planilla.cantidad > 0) {
      return { categoria: c.valor, cantidad: "1", precio: String(equipo.planilla.total) };
    }
    return { categoria: c.valor, cantidad: "", precio: "" };
  });
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
  fecha: string;
  filas: { informeCampoId: string; operador: string; drone: string; hectareas: number; precio: number }[];
  gastosOperativos: {
    operador: string | null;
    ayudantes: string[];
    items: { categoria: string; cantidad: number; precio: number }[];
  }[];
  detallePlanilla: { informeCampoId: string; colaborador: string; fecha: string; monto: number }[];
};

function bloqueDesdeInicial(inicial: ValoresInforme["gastosOperativos"][number]): BloqueGastoDraft {
  const operador = inicial.operador ?? "";
  return {
    key: claveEquipo(operador, inicial.ayudantes),
    operador,
    ayudantes: inicial.ayudantes,
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
  proyectos,
  valoresIniciales,
}: {
  fechaHoy: string;
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
  const [precio, setPrecio] = useState(String(v?.precio ?? valoresIniciales?.precio ?? ""));
  // La fecha nunca se edita a mano: al crear queda como la fecha actual
  // (fechaHoy, la fecha en que se está haciendo el análisis), y al editar
  // se conserva la fecha con la que se creó -- pedido explícito del
  // usuario, ya no hay un rango que llenar.
  const fecha = valoresIniciales?.fecha ?? fechaHoy;

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    setProyectoId(state.values?.proyectoId ?? "");
    setPrecio(String(state.values?.precio ?? ""));
  }

  // Todo lo que se carga solo a partir del Proyecto elegido vive en un solo
  // estado (en vez de 5 sueltos) para poder actualizarlo de una sola vez
  // dentro del efecto de abajo. proyectoId identifica a qué Proyecto
  // corresponde esta vista -- mientras no coincida con el proyectoId
  // elegido, "cargandoProyecto" se deriva como true (sin necesidad de un
  // setState aparte dentro del efecto).
  // Un renglón por trabajador+Informe de Campo -- el Monto se sugiere solo
  // (misma tarifa que "Calcular pago sugerido") pero es editable; la
  // agrupación por trabajador (para mostrarlo) se arma al vuelo al
  // renderizar, no vive en el estado.
  type DiaPlanillaDraft = { informeCampoId: string; colaborador: string; fecha: string; monto: string };

  type VistaProyecto = {
    proyectoId: string;
    cliente: string;
    hectareas: number | null;
    filas: FilaDraft[];
    gastosOperativos: BloqueGastoDraft[];
    infoAuto: InfoAutoPorEquipo;
    detallePlanilla: DiaPlanillaDraft[];
    gastosProyecto: GastoProyectoRegistrado[];
  };

  const [vista, setVista] = useState<VistaProyecto>(() => {
    let filas: FilaDraft[] = [];
    if (v?.filas) {
      try {
        const parsed = JSON.parse(v.filas) as { informeCampoId: string; precio: number }[];
        filas = parsed.map((f) => ({
          informeCampoId: f.informeCampoId,
          operador: "",
          drone: "",
          hectareas: 0,
          precio: String(f.precio),
        }));
      } catch {
        // sigue abajo con los valores iniciales / vacío
      }
    } else if (valoresIniciales?.filas) {
      filas = valoresIniciales.filas.map((f) => ({
        informeCampoId: f.informeCampoId,
        operador: f.operador,
        drone: f.drone,
        hectareas: f.hectareas,
        precio: String(f.precio),
      }));
    }

    let gastosOperativos: BloqueGastoDraft[] = [];
    if (v?.gastosOperativos) {
      try {
        const parsed = JSON.parse(v.gastosOperativos) as {
          equipoKey: string;
          items: { categoria: string; cantidad: number; precio: number }[];
        }[];
        gastosOperativos = parsed.map((b) => ({
          key: b.equipoKey,
          operador: "",
          ayudantes: [],
          items: b.items.map((it) => ({
            categoria: it.categoria,
            cantidad: String(it.cantidad),
            precio: String(it.precio),
          })),
        }));
      } catch {
        // sigue abajo con los valores iniciales / sin bloques
      }
    } else if (valoresIniciales?.gastosOperativos) {
      gastosOperativos = valoresIniciales.gastosOperativos.map(bloqueDesdeInicial);
    }

    let detallePlanilla: DiaPlanillaDraft[] = [];
    if (v?.planillaDetalle) {
      try {
        const parsed = JSON.parse(v.planillaDetalle) as { informeCampoId: string; colaborador: string; monto: number }[];
        detallePlanilla = parsed.map((d) => ({
          informeCampoId: d.informeCampoId,
          colaborador: d.colaborador,
          fecha: "",
          monto: String(d.monto),
        }));
      } catch {
        // sigue abajo con los valores iniciales / vacío
      }
    } else if (valoresIniciales?.detallePlanilla) {
      detallePlanilla = valoresIniciales.detallePlanilla.map((d) => ({
        informeCampoId: d.informeCampoId,
        colaborador: d.colaborador,
        fecha: d.fecha,
        monto: String(d.monto),
      }));
    }

    return {
      proyectoId: valoresIniciales?.proyectoId ?? v?.proyectoId ?? "",
      cliente: valoresIniciales?.cliente ?? "",
      hectareas: valoresIniciales?.hectareas ?? null,
      filas,
      gastosOperativos,
      infoAuto: {},
      detallePlanilla,
      gastosProyecto: [],
    };
  });
  const { cliente, hectareas, filas, gastosOperativos, infoAuto, detallePlanilla, gastosProyecto } = vista;
  const cargandoProyecto = proyectoId !== "" && vista.proyectoId !== proyectoId;

  // Al elegir (o cambiar) el Proyecto se cargan solos el Cliente, las
  // Hectáreas, el cuadro Drone/HA (una fila por Informe de Campo) y los
  // bloques de Gastos Operativos (uno por Operador+Ayudantes, con Viáticos
  // sugeridos desde Caja Menuda y Planilla calculada con la misma tarifa
  // de "Calcular pago sugerido" -- no depende de que ya exista un Pago
  // registrado) -- el servidor vuelve a calcular estos mismos valores al
  // guardar, esto es solo la vista previa. Lo que ya se haya escrito a
  // mano por fila/categoría se conserva (se busca por informeCampoId o por
  // equipoKey), tanto al reintentar tras un error como al recargar el
  // mismo Proyecto.
  useEffect(() => {
    if (!proyectoId) return;
    let cancelado = false;
    obtenerDatosProyectoAction(proyectoId)
      .then((datos) => {
        if (cancelado) return;
        setVista((prev) => ({
          proyectoId,
          cliente: datos.cliente,
          hectareas: datos.hectareas,
          filas: datos.filas.map((f) => {
            const anterior = prev.filas.find((p) => p.informeCampoId === f.informeCampoId);
            return {
              informeCampoId: f.informeCampoId,
              operador: f.operador,
              drone: f.drone,
              hectareas: f.hectareas,
              precio: anterior ? anterior.precio : "",
            };
          }),
          gastosOperativos: datos.equipos.map((eq) => {
            const anterior = prev.gastosOperativos.find((b) => b.key === eq.key);
            return {
              key: eq.key,
              operador: eq.operador,
              ayudantes: eq.ayudantes,
              items: itemsAutoPara(eq, anterior?.items),
            };
          }),
          infoAuto: Object.fromEntries(
            datos.equipos.map((eq) => [eq.key, { viaticos: eq.viaticos, planilla: eq.planilla }]),
          ),
          detallePlanilla: datos.detallePlanilla.flatMap((trabajador) =>
            trabajador.dias.map((dia) => {
              const anterior = prev.detallePlanilla.find(
                (d) => d.informeCampoId === dia.informeCampoId && d.colaborador === trabajador.colaborador,
              );
              return {
                informeCampoId: dia.informeCampoId,
                colaborador: trabajador.colaborador,
                fecha: dia.fecha,
                monto: anterior ? anterior.monto : String(dia.monto),
              };
            }),
          ),
          gastosProyecto: datos.gastosProyecto,
        }));
      })
      .catch(() => {
        if (cancelado) return;
        setVista((prev) => ({ ...prev, proyectoId, cliente: "—", hectareas: null }));
      });
    return () => {
      cancelado = true;
    };
  }, [proyectoId]);

  const total = (hectareas ?? 0) * (Number(precio) || 0);

  const totalEquiposGastos = gastosOperativos.reduce(
    (s, b) => s + b.items.reduce((si, it) => si + (Number(it.cantidad) || 0) * (Number(it.precio) || 0), 0),
    0,
  );
  const totalGastosProyectoRegistrados = gastosProyecto.reduce((s, g) => s + g.monto, 0);
  const totalGastosOperativos = totalEquiposGastos + totalGastosProyectoRegistrados;

  function actualizarPrecioFila(index: number, valor: string) {
    setVista((prev) => ({
      ...prev,
      filas: prev.filas.map((f, i) => (i === index ? { ...f, precio: valor } : f)),
    }));
  }

  function actualizarMontoPlanilla(informeCampoId: string, colaborador: string, valor: string) {
    setVista((prev) => ({
      ...prev,
      detallePlanilla: prev.detallePlanilla.map((d) =>
        d.informeCampoId === informeCampoId && d.colaborador === colaborador ? { ...d, monto: valor } : d,
      ),
    }));
  }

  function actualizarItemGasto(
    bloqueIndex: number,
    itemIndex: number,
    campo: "cantidad" | "precio",
    valor: string,
  ) {
    setVista((prev) => ({
      ...prev,
      gastosOperativos: prev.gastosOperativos.map((b, i) =>
        i !== bloqueIndex
          ? b
          : { ...b, items: b.items.map((it, j) => (j === itemIndex ? { ...it, [campo]: valor } : it)) },
      ),
    }));
  }

  const filasParaEnviar = filas.map((f) => ({
    informeCampoId: f.informeCampoId,
    precio: Number(f.precio) || 0,
  }));

  const gastosOperativosParaEnviar = gastosOperativos.map((b) => ({
    equipoKey: b.key,
    items: b.items.map((it) => ({
      categoria: it.categoria,
      cantidad: Number(it.cantidad) || 0,
      precio: Number(it.precio) || 0,
    })),
  }));

  const planillaDetalleParaEnviar = detallePlanilla.map((d) => ({
    informeCampoId: d.informeCampoId,
    colaborador: d.colaborador,
    monto: Number(d.monto) || 0,
  }));

  // La agrupación por trabajador es solo para mostrar -- el estado en sí
  // (detallePlanilla) sigue siendo una lista plana de trabajador+Informe.
  const gruposPlanilla = Array.from(
    detallePlanilla
      .reduce((mapa, dia) => {
        const grupo = mapa.get(dia.colaborador) ?? [];
        grupo.push(dia);
        mapa.set(dia.colaborador, grupo);
        return mapa;
      }, new Map<string, DiaPlanillaDraft[]>())
      .entries(),
  ).map(([colaborador, dias]) => ({
    colaborador,
    dias,
    total: dias.reduce((s, d) => s + (Number(d.monto) || 0), 0),
  }));

  // Mismo cálculo que la pantalla de detalle (informes/proyecto/[id]/
  // page.tsx), pero en vivo mientras se llena el formulario: % Ganancias y
  // % Gastos son el margen neto de ESE equipo, Promedio de Gastos por HA
  // es su gasto entre sus hectáreas.
  const rendimientoPorEquipo = gastosOperativos.map((bloque) => {
    const operadorNorm = bloque.operador.trim();
    const filasEquipo = filas.filter((f) => f.operador.trim() === operadorNorm);
    const ingresos = filasEquipo.reduce((s, f) => s + f.hectareas * (Number(f.precio) || 0), 0);
    const hectareasEquipo = filasEquipo.reduce((s, f) => s + f.hectareas, 0);
    const gastos = bloque.items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio) || 0), 0);
    const gananciaNeta = ingresos - gastos;
    return {
      key: bloque.key,
      etiquetaEquipo: textoEquipoDeCampo(bloque.operador, bloque.ayudantes) || "Equipo sin nombre",
      gananciaNeta,
      gastos,
      porcentajeGanancias: ingresos > 0 ? (gananciaNeta / ingresos) * 100 : null,
      porcentajeGastos: ingresos > 0 ? (gastos / ingresos) * 100 : null,
      promedioGastosPorHa: hectareasEquipo > 0 ? gastos / hectareasEquipo : null,
    };
  });

  // Consolidado de todos los equipos, en vivo -- mismo criterio que la
  // pantalla de detalle: Ingresos = suma de HA×Precio de todas las filas
  // (no el Precio único del encabezado), Gastos = totalGastosOperativos
  // (ya incluye equipos + gastos registrados al proyecto en general).
  const totalFilasSuma = filas.reduce((s, f) => s + f.hectareas * (Number(f.precio) || 0), 0);
  const hectareasFilasSuma = filas.reduce((s, f) => s + f.hectareas, 0);
  const rendimientoTotal = {
    gananciaNeta: totalFilasSuma - totalGastosOperativos,
    gastos: totalGastosOperativos,
    porcentajeGanancias:
      totalFilasSuma > 0 ? ((totalFilasSuma - totalGastosOperativos) / totalFilasSuma) * 100 : null,
    porcentajeGastos: totalFilasSuma > 0 ? (totalGastosOperativos / totalFilasSuma) * 100 : null,
    promedioGastosPorHa: hectareasFilasSuma > 0 ? totalGastosOperativos / hectareasFilasSuma : null,
  };

  return (
    <form key={remountKey} action={formAction} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="filas" value={JSON.stringify(filasParaEnviar)} />
      <input type="hidden" name="gastosOperativos" value={JSON.stringify(gastosOperativosParaEnviar)} />
      <input type="hidden" name="planillaDetalle" value={JSON.stringify(planillaDetalleParaEnviar)} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      <div className="grid max-w-2xl grid-cols-1 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <div className="sm:col-span-2">
          <SelectField
            label="Proyecto"
            name="proyectoId"
            value={proyectoId}
            onChange={(e) => {
              const valor = e.target.value;
              setProyectoId(valor);
              if (!valor)
                setVista({
                  proyectoId: "",
                  cliente: "",
                  hectareas: null,
                  filas: [],
                  gastosOperativos: [],
                  infoAuto: {},
                  detallePlanilla: [],
                  gastosProyecto: [],
                });
            }}
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
        <CampoLectura label="Fecha" valor={formatDateOnly(fecha)} />
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                <th className="px-2 py-2 font-medium">Operador</th>
                <th className="px-2 py-2 font-medium">Drone</th>
                <th className="px-2 py-2 font-medium">HA</th>
                <th className="px-2 py-2 font-medium">Precio</th>
                <th className="px-2 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-sm text-green-700/70 dark:text-green-200/70">
                    {cargandoProyecto
                      ? "Cargando..."
                      : proyectoId
                        ? "Este proyecto todavía no tiene Informes de Campo."
                        : "Elige un Proyecto para ver sus Informes de Campo."}
                  </td>
                </tr>
              ) : (
                filas.map((f, i) => {
                  const total = f.hectareas * (Number(f.precio) || 0);
                  return (
                    <tr key={f.informeCampoId} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                      <td className="px-2 py-2 text-green-900 dark:text-green-50">{f.operador}</td>
                      <td className="px-2 py-2 text-green-900 dark:text-green-50">{f.drone}</td>
                      <td className="px-2 py-2 text-green-900 dark:text-green-50">{f.hectareas}</td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={f.precio}
                          onChange={(e) => actualizarPrecioFila(i, e.target.value)}
                          className={CLASE_INPUT}
                        />
                      </td>
                      <td className="px-2 py-2 font-medium text-green-900 dark:text-green-50">
                        {formatMoney(total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Gastos operativos</h2>

        {gastosOperativos.length === 0 && (
          <p className="rounded-xl border border-green-100 bg-white px-4 py-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {cargandoProyecto
              ? "Cargando..."
              : proyectoId
                ? "Este proyecto todavía no tiene Informes de Campo."
                : "Elige un Proyecto para ver sus equipos de trabajo."}
          </p>
        )}

        {gastosOperativos.map((bloque, bi) => {
          const totalBloque = bloque.items.reduce(
            (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio) || 0),
            0,
          );
          const info = infoAuto[bloque.key];
          return (
            <div
              key={bloque.key}
              className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-50">
                {textoEquipoDeCampo(bloque.operador, bloque.ayudantes) || "Equipo sin nombre"}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                      <th className="px-2 py-2 font-medium">Categoría</th>
                      <th className="px-2 py-2 font-medium">Cantidad</th>
                      <th className="px-2 py-2 font-medium">Precio unitario</th>
                      <th className="px-2 py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloque.items.map((item, ii) => {
                      const totalItem = (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
                      const etiqueta = CATEGORIAS_GASTO_OPERATIVO.find((c) => c.valor === item.categoria)!.etiqueta;
                      const autoDe =
                        item.categoria === "viaticos"
                          ? info?.viaticos
                          : item.categoria === "planilla"
                            ? info?.planilla
                            : undefined;
                      return (
                        <tr key={item.categoria} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                          <td className="px-2 py-2 text-green-900 dark:text-green-50">
                            {etiqueta}
                            {autoDe && autoDe.cantidad > 0 && (
                              <span className="block text-xs font-normal text-green-700/70 dark:text-green-300/70">
                                {item.categoria === "viaticos"
                                  ? `${autoDe.cantidad} en Caja Menuda`
                                  : `calculado de ${autoDe.cantidad} Informe${autoDe.cantidad === 1 ? "" : "s"} de Campo`}{" "}
                                ({formatMoney(autoDe.total)})
                              </span>
                            )}
                          </td>
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
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                      <td className="px-2 py-2 text-green-900 dark:text-green-50" colSpan={3}>
                        total
                      </td>
                      <td className="px-2 py-2 text-green-700 dark:text-green-400">{formatMoney(totalBloque)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}

        {gastosProyecto.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <h3 className="border-b border-green-100 bg-green-50 px-4 py-2 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
              Gastos registrados para este proyecto (Caja Menuda / Compras)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Origen</th>
                    <th className="px-3 py-2 font-medium">Categoría</th>
                    <th className="px-3 py-2 font-medium">Descripción</th>
                    <th className="px-3 py-2 font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosProyecto.map((g) => (
                    <tr key={`${g.origen}-${g.id}`} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                      <td className="px-3 py-2 text-green-800/80 dark:text-green-200/80">{formatDateOnly(g.fecha)}</td>
                      <td className="px-3 py-2 text-green-800/80 dark:text-green-200/80">
                        {g.origen === "caja_menuda" ? "Caja Menuda" : "Compras"}
                      </td>
                      <td className="px-3 py-2 text-green-900 dark:text-green-50">{g.categoria}</td>
                      <td className="px-3 py-2 text-green-800/80 dark:text-green-200/80">{g.descripcion || "—"}</td>
                      <td className="px-3 py-2 font-medium text-green-900 dark:text-green-50">
                        {formatMoney(g.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                    <td className="px-3 py-2 text-green-900 dark:text-green-50" colSpan={4}>
                      total
                    </td>
                    <td className="px-3 py-2 text-green-700 dark:text-green-400">
                      {formatMoney(totalGastosProyectoRegistrados)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {(gastosOperativos.length > 0 || gastosProyecto.length > 0) && (
          <div className="rounded-xl border border-green-100 bg-green-50/60 px-6 py-4 text-right dark:border-green-900/40 dark:bg-green-950/20">
            <span className="text-sm font-medium text-green-900 dark:text-green-50">Total Gastos Operativos: </span>
            <span className="text-lg font-semibold text-green-700 dark:text-green-400">
              {formatMoney(totalGastosOperativos)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Detalle de pago de Planilla</h2>

        {detallePlanilla.length === 0 ? (
          <p className="rounded-xl border border-green-100 bg-white px-4 py-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            {cargandoProyecto
              ? "Cargando..."
              : proyectoId
                ? "Este proyecto todavía no tiene Informes de Campo clasificados (Ingenio Santa Rosa/Particular)."
                : "Elige un Proyecto para ver el detalle de pago por trabajador."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {gruposPlanilla.map((trabajador) => (
              <div
                key={trabajador.colaborador}
                className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
              >
                <h3 className="border-b border-green-100 bg-green-50 px-4 py-2 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
                  {trabajador.colaborador}
                </h3>
                <table className="w-full text-left text-sm">
                  <tbody>
                    {trabajador.dias.map((dia) => (
                      <tr
                        key={dia.informeCampoId}
                        className="border-b border-green-50 last:border-0 dark:border-green-900/30"
                      >
                        <td className="px-4 py-2 text-green-800/80 dark:text-green-200/80">
                          {formatDateOnly(dia.fecha)}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={dia.monto}
                            onChange={(e) => actualizarMontoPlanilla(dia.informeCampoId, dia.colaborador, e.target.value)}
                            className={`${CLASE_INPUT} text-right`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                      <td className="px-4 py-2 text-green-900 dark:text-green-50">total</td>
                      <td className="px-4 py-2 text-right text-green-700 dark:text-green-400">
                        {formatMoney(trabajador.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {rendimientoPorEquipo.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Rendimiento por equipo</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rendimientoPorEquipo.map((eq) => (
              <div
                key={eq.key}
                className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
              >
                <h3 className="border-b border-green-100 bg-green-50 px-4 py-2 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
                  {eq.etiquetaEquipo}
                </h3>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                      <th className="px-4 py-2 font-medium">Porcentaje de Ganancias</th>
                      <th className="px-4 py-2 font-medium">Porcentaje de Gastos</th>
                      <th className="px-4 py-2 font-medium">Promedio de Gastos por HA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-green-50 dark:border-green-900/30">
                      <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                        {eq.porcentajeGanancias !== null ? `${eq.porcentajeGanancias.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                        {eq.porcentajeGastos !== null ? `${eq.porcentajeGastos.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                        {eq.promedioGastosPorHa !== null ? formatMoney(eq.promedioGastosPorHa) : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                        {formatMoney(eq.gananciaNeta)}
                      </td>
                      <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                        {formatMoney(eq.gastos)}
                      </td>
                      <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <h3 className="border-b border-green-100 bg-green-50 px-4 py-2 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
              Total del Proyecto (todos los equipos)
            </h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-4 py-2 font-medium">Porcentaje de Ganancias</th>
                  <th className="px-4 py-2 font-medium">Porcentaje de Gastos</th>
                  <th className="px-4 py-2 font-medium">Promedio de Gastos por HA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-green-50 dark:border-green-900/30">
                  <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                    {rendimientoTotal.porcentajeGanancias !== null
                      ? `${rendimientoTotal.porcentajeGanancias.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                    {rendimientoTotal.porcentajeGastos !== null
                      ? `${rendimientoTotal.porcentajeGastos.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                    {rendimientoTotal.promedioGastosPorHa !== null
                      ? formatMoney(rendimientoTotal.promedioGastosPorHa)
                      : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatMoney(rendimientoTotal.gananciaNeta)}
                  </td>
                  <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatMoney(rendimientoTotal.gastos)}
                  </td>
                  <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

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
