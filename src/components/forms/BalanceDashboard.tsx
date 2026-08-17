"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  LineChart,
  Line,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  exportarMovimientosExcel,
  exportarMovimientosPDF,
  type MovimientoExportable,
} from "@/lib/exportar";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { CATEGORIA_GASTO_LABEL } from "@/lib/validation/gastos";

const COLORES_CATEGORIA = ["#dc2626", "#ea580c", "#ca8a04", "#65a30d", "#0891b2", "#7c3aed"];

const NOMBRES_MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const NOMBRES_MES_LARGO = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// El ingreso real de una venta es subtotal_gravado + subtotal_exento -- el
// ITBMS cobrado NO cuenta como ingreso del negocio (es dinero que se cobra
// para el gobierno, no ganancia de Agro Sky), se muestra solo como
// referencia aparte.
export type VentaBalance = {
  fecha: string;
  ingreso: number;
  itbms: number;
};

export type PagoPlanillaBalance = {
  fecha: string;
  colaborador: string;
  // Ya viene neto de descuento de préstamo (ver balance/page.tsx) -- es lo
  // que realmente salió de la empresa esta quincena.
  monto: number;
  // Monto del descuento de préstamo de este pago, si tuvo -- aparte de
  // "monto" solo para poder mostrar "abonado en el período" en la sección
  // Préstamos, sin tener que sumarlo de nuevo desde otro lado.
  montoPrestamo: number;
};

// Préstamos que la empresa le hace a un colaborador (Fijo o Campo) -- no
// es Ingreso ni Egreso real (mismo criterio que las reposiciones de Caja
// Menuda: es plata que la empresa ya tenía, movida a otro lado, no gasto
// nuevo). Se muestra aparte, solo informativo.
export type PrestamoBalance = {
  fecha: string;
  monto: number;
};

// Gastos operativos fijos de la empresa (alquiler, luz, agua, internet,
// teléfono, etc.) registrados en Compras > Gastos -- distintos de Caja
// Menuda (gastos chicos del día a día) y de Órdenes de Compra (piezas de
// Inventario), ver migración 0056_proveedores_gastos.sql. Categorías
// propias, administrables (ver migración 0068), no las de Caja Menuda.
export type GastoCompraBalance = {
  fecha: string;
  categoria: string;
  categoriaOtro: string | null;
  proveedorNombre: string | null;
  numeroFactura: string | null;
  monto: number;
};

type BarraDatos = { nombre: string; monto: number; color: string };

function GraficaDosBarras({ datos, altura = "h-64" }: { datos: BarraDatos[]; altura?: string }) {
  return (
    <div className={altura}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 24, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nombre" />
          <YAxis tickFormatter={(v: number) => formatMoney(v)} width={90} />
          <Tooltip formatter={(value) => formatMoney(Number(value))} />
          <Bar dataKey="monto">
            <LabelList
              dataKey="monto"
              position="top"
              formatter={(value) => formatMoney(Number(value))}
              style={{ fontWeight: 600 }}
            />
            {datos.map((d) => (
              <Cell key={d.nombre} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type PuntoLineaAnual = { mes: string; mesLargo: string; ingresos: number; egresos: number; neto: number };

function GraficaLineasAnual({ datos }: { datos: PuntoLineaAnual[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis tickFormatter={(v: number) => formatMoney(v)} width={90} />
          <Tooltip formatter={(value) => formatMoney(Number(value))} />
          <Legend />
          <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Botón "Ver detalle / Ocultar detalle" reutilizable -- cada cuadro con
// datos lo trae junto al título, y despliega debajo la lista de
// movimientos que arman ese número (pedido del usuario, 2026-08-12).
function BotonDesplegable({ abierto, onClick }: { abierto: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={abierto}
      className="flex shrink-0 items-center gap-1 rounded-full border border-green-200 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
    >
      {abierto ? "Ocultar detalle" : "Ver detalle"}
      <span className={`inline-block transition-transform ${abierto ? "-rotate-90" : "rotate-90"}`}>›</span>
    </button>
  );
}

type ColumnaDetalle<T> = {
  header: string;
  render: (fila: T) => ReactNode;
  alinDerecha?: boolean;
};

// Tabla genérica para el contenido de cada desplegable -- misma pinta en
// los 9 cuadros de Balance, solo cambian las columnas y las filas.
function TablaDetalle<T>({
  columnas,
  filas,
  clave,
  vacio,
}: {
  columnas: ColumnaDetalle<T>[];
  filas: T[];
  clave: (fila: T, indice: number) => string;
  vacio: string;
}) {
  if (filas.length === 0) {
    return <p className="text-sm text-green-700/70 dark:text-green-300/70">{vacio}</p>;
  }
  return (
    <div className="max-h-80 overflow-y-auto overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="sticky top-0 bg-white dark:bg-green-950">
          <tr className="border-b border-green-200 text-xs uppercase tracking-wide text-green-700/70 dark:border-green-800 dark:text-green-300/70">
            {columnas.map((c) => (
              <th key={c.header} className={`py-2 pr-4 font-medium ${c.alinDerecha ? "text-right" : ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={clave(fila, i)} className="border-b border-green-50 dark:border-green-950/40">
              {columnas.map((c) => (
                <td
                  key={c.header}
                  className={`py-2 pr-4 text-green-900 dark:text-green-100 ${c.alinDerecha ? "text-right" : ""}`}
                >
                  {c.render(fila)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BalanceDashboard({
  movimientos,
  ventas,
  pagosPlanilla,
  colaboradores,
  gastosCompras,
  prestamos,
  categoriasCajaMenuda,
  categoriasCompras,
}: {
  movimientos: MovimientoExportable[];
  ventas: VentaBalance[];
  pagosPlanilla: PagoPlanillaBalance[];
  colaboradores: string[];
  gastosCompras: GastoCompraBalance[];
  prestamos: PrestamoBalance[];
  categoriasCajaMenuda: string[];
  categoriasCompras: { nombre: string; tipo: "fijo" | "variable" }[];
}) {
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  function alternar(clave: string) {
    setAbiertos((prev) => ({ ...prev, [clave]: !prev[clave] }));
  }

  // --- Vista mensual/anual de gastos + Ingresos vs Egresos por mes -----
  // Selector propio (Año + Mes), independiente del filtro de período de
  // arriba -- ese filtro no tiene forma de pedir "todo un año, mes a mes",
  // que es justo lo que pide este bloque.
  const añoActual = new Date().getFullYear();
  const [añoVista, setAñoVista] = useState(añoActual);
  const [mesVista, setMesVista] = useState(""); // "" = año completo (Ene-Dic), "01".."12" = un mes

  const añosDisponibles = useMemo(() => {
    const años = new Set<number>([añoActual]);
    for (const m of movimientos) años.add(Number(m.fecha.slice(0, 4)));
    for (const g of gastosCompras) años.add(Number(g.fecha.slice(0, 4)));
    for (const p of pagosPlanilla) años.add(Number(p.fecha.slice(0, 4)));
    for (const v of ventas) años.add(Number(v.fecha.slice(0, 4)));
    return Array.from(años).sort((a, b) => b - a);
  }, [movimientos, gastosCompras, pagosPlanilla, ventas, añoActual]);

  // Filas del cuadro de gastos, agrupadas en "Gastos Fijos" y "Gastos
  // Variables" (pedido del usuario 2026-08-13). Fijos = solo categorías
  // de Compras > Gastos marcadas como tal. Variables = el resto de
  // Compras + "Planilla" + "Diésel"/"Gasolina" (de Caja Menuda) + "Caja
  // Menuda" -- estas 4 últimas no son categorías de Compras, son otros
  // orígenes de egresos de la empresa (pedido 2026-08-12, ampliado hoy).
  // Diésel/Gasolina se restan del total de "Caja Menuda" para no contar
  // el mismo gasto 2 veces.
  const filasGastosMensuales = useMemo(() => {
    function armarFila(nombre: string, etiqueta: string, tipo: "fijo" | "variable", montosPorMes: number[]) {
      return { nombre, etiqueta, tipo, montosPorMes, total: montosPorMes.reduce((s, m) => s + m, 0) };
    }

    const filasCompras = categoriasCompras.map((c) =>
      armarFila(
        c.nombre,
        CATEGORIA_GASTO_LABEL[c.nombre] ?? c.nombre,
        c.tipo,
        NOMBRES_MES.map((_, i) => {
          const prefijo = `${añoVista}-${String(i + 1).padStart(2, "0")}`;
          return gastosCompras
            .filter((g) => g.categoria === c.nombre && g.fecha.startsWith(prefijo))
            .reduce((s, g) => s + g.monto, 0);
        }),
      ),
    );

    const montosPlanilla = NOMBRES_MES.map((_, i) => {
      const prefijo = `${añoVista}-${String(i + 1).padStart(2, "0")}`;
      return pagosPlanilla.filter((p) => p.fecha.startsWith(prefijo)).reduce((s, p) => s + p.monto, 0);
    });
    const montosDiesel = NOMBRES_MES.map((_, i) => {
      const prefijo = `${añoVista}-${String(i + 1).padStart(2, "0")}`;
      return movimientos
        .filter((m) => m.tipo === "gasto" && m.categoria === "Diésel" && m.fecha.startsWith(prefijo))
        .reduce((s, m) => s + m.monto, 0);
    });
    const montosGasolina = NOMBRES_MES.map((_, i) => {
      const prefijo = `${añoVista}-${String(i + 1).padStart(2, "0")}`;
      return movimientos
        .filter((m) => m.tipo === "gasto" && m.categoria === "Gasolina" && m.fecha.startsWith(prefijo))
        .reduce((s, m) => s + m.monto, 0);
    });
    const montosCajaMenuda = NOMBRES_MES.map((_, i) => {
      const prefijo = `${añoVista}-${String(i + 1).padStart(2, "0")}`;
      return movimientos
        .filter(
          (m) =>
            m.tipo === "gasto" &&
            m.fecha.startsWith(prefijo) &&
            m.categoria !== "Diésel" &&
            m.categoria !== "Gasolina",
        )
        .reduce((s, m) => s + m.monto, 0);
    });

    const filasFijas = filasCompras.filter((f) => f.tipo === "fijo");
    const filasVariables = [
      ...filasCompras.filter((f) => f.tipo === "variable"),
      armarFila("Planilla", "Planilla", "variable", montosPlanilla),
      armarFila("Diésel", "Diésel", "variable", montosDiesel),
      armarFila("Gasolina", "Gasolina", "variable", montosGasolina),
      armarFila("Caja Menuda", "Caja Menuda", "variable", montosCajaMenuda),
    ];
    return { filasFijas, filasVariables };
  }, [categoriasCompras, gastosCompras, pagosPlanilla, movimientos, añoVista]);

  const { filasFijas, filasVariables } = filasGastosMensuales;
  const totalesPorMesFijos = NOMBRES_MES.map((_, i) => filasFijas.reduce((s, f) => s + f.montosPorMes[i], 0));
  const totalesPorMesVariables = NOMBRES_MES.map((_, i) =>
    filasVariables.reduce((s, f) => s + f.montosPorMes[i], 0),
  );
  const totalesPorMesGastos = NOMBRES_MES.map((_, i) => totalesPorMesFijos[i] + totalesPorMesVariables[i]);
  const totalFijosGeneral = totalesPorMesFijos.reduce((s, m) => s + m, 0);
  const totalVariablesGeneral = totalesPorMesVariables.reduce((s, m) => s + m, 0);
  const totalGeneralVistaGastos = totalesPorMesGastos.reduce((s, m) => s + m, 0);
  const hayDatosVistaGastos = totalGeneralVistaGastos > 0;
  const indiceMesVista = mesVista === "" ? null : Number(mesVista) - 1;

  type FilaDetalleGasto = { fecha: string; origen: string; categoria: string; monto: number };
  const detalleVistaGastos: FilaDetalleGasto[] = useMemo(() => {
    const prefijoFiltro = mesVista === "" ? `${añoVista}` : `${añoVista}-${mesVista}`;
    const filas: FilaDetalleGasto[] = [];
    for (const g of gastosCompras) {
      if (g.fecha.startsWith(prefijoFiltro)) {
        filas.push({
          fecha: g.fecha,
          origen: "Compras",
          categoria: CATEGORIA_GASTO_LABEL[g.categoria] ?? g.categoria,
          monto: g.monto,
        });
      }
    }
    for (const m of movimientos) {
      if (m.tipo === "gasto" && m.fecha.startsWith(prefijoFiltro)) {
        filas.push({ fecha: m.fecha, origen: "Caja Menuda", categoria: m.categoria ?? "Sin categoría", monto: m.monto });
      }
    }
    for (const p of pagosPlanilla) {
      if (p.fecha.startsWith(prefijoFiltro)) {
        filas.push({ fecha: p.fecha, origen: "Planilla", categoria: p.colaborador, monto: p.monto });
      }
    }
    return filas.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  }, [gastosCompras, movimientos, pagosPlanilla, añoVista, mesVista]);

  const datosLineaAnual: PuntoLineaAnual[] = useMemo(() => {
    return NOMBRES_MES.map((nombreMes, i) => {
      const prefijo = `${añoVista}-${String(i + 1).padStart(2, "0")}`;
      const ingresos = ventas.filter((v) => v.fecha.startsWith(prefijo)).reduce((s, v) => s + v.ingreso, 0);
      const egresosCaja = movimientos
        .filter((m) => m.tipo === "gasto" && m.fecha.startsWith(prefijo))
        .reduce((s, m) => s + m.monto, 0);
      const egresosPlanilla = pagosPlanilla
        .filter((p) => p.fecha.startsWith(prefijo))
        .reduce((s, p) => s + p.monto, 0);
      const egresosCompras = gastosCompras
        .filter((g) => g.fecha.startsWith(prefijo))
        .reduce((s, g) => s + g.monto, 0);
      const egresos = egresosCaja + egresosPlanilla + egresosCompras;
      return { mes: nombreMes, mesLargo: NOMBRES_MES_LARGO[i], ingresos, egresos, neto: ingresos - egresos };
    });
  }, [ventas, movimientos, pagosPlanilla, gastosCompras, añoVista]);

  const hayDatosLineaAnual = datosLineaAnual.some((d) => d.ingresos > 0 || d.egresos > 0);

  // --- Resto del dashboard --
  // Antes había un selector de Período arriba (semana/mes/año/vida/rango) --
  // se quitó (pedido del usuario): estas secciones ahora siempre muestran
  // la vida completa, sin filtro de fecha.
  const fechaDesde: string = "";
  const fechaHasta: string = "";
  const listo = true;

  const movimientosFiltrados = useMemo(() => {
    if (!listo) return [];
    return movimientos.filter((m) => {
      if (fechaDesde && m.fecha < fechaDesde) return false;
      if (fechaHasta && m.fecha > fechaHasta) return false;
      return true;
    });
  }, [movimientos, fechaDesde, fechaHasta, listo]);

  const ventasFiltradas = useMemo(() => {
    if (!listo) return [];
    return ventas.filter((v) => {
      if (fechaDesde && v.fecha < fechaDesde) return false;
      if (fechaHasta && v.fecha > fechaHasta) return false;
      return true;
    });
  }, [ventas, fechaDesde, fechaHasta, listo]);

  const pagosFiltrados = useMemo(() => {
    if (!listo) return [];
    return pagosPlanilla.filter((p) => {
      if (fechaDesde && p.fecha < fechaDesde) return false;
      if (fechaHasta && p.fecha > fechaHasta) return false;
      return true;
    });
  }, [pagosPlanilla, fechaDesde, fechaHasta, listo]);

  const gastosComprasFiltrados = useMemo(() => {
    if (!listo) return [];
    return gastosCompras.filter((g) => {
      if (fechaDesde && g.fecha < fechaDesde) return false;
      if (fechaHasta && g.fecha > fechaHasta) return false;
      return true;
    });
  }, [gastosCompras, fechaDesde, fechaHasta, listo]);

  const prestamosFiltrados = useMemo(() => {
    if (!listo) return [];
    return prestamos.filter((p) => {
      if (fechaDesde && p.fecha < fechaDesde) return false;
      if (fechaHasta && p.fecha > fechaHasta) return false;
      return true;
    });
  }, [prestamos, fechaDesde, fechaHasta, listo]);

  const totalReposiciones = movimientosFiltrados
    .filter((m) => m.tipo === "reposicion")
    .reduce((suma, m) => suma + m.monto, 0);
  const totalGastosCaja = movimientosFiltrados
    .filter((m) => m.tipo === "gasto")
    .reduce((suma, m) => suma + m.monto, 0);
  const totalVentas = ventasFiltradas.reduce((suma, v) => suma + v.ingreso, 0);
  const totalItbms = ventasFiltradas.reduce((suma, v) => suma + v.itbms, 0);
  const totalPlanilla = pagosFiltrados.reduce((suma, p) => suma + p.monto, 0);
  const totalPrestado = prestamosFiltrados.reduce((suma, p) => suma + p.monto, 0);
  const totalAbonado = pagosFiltrados.reduce((suma, p) => suma + p.montoPrestamo, 0);
  const abonosFiltrados = pagosFiltrados.filter((p) => p.montoPrestamo > 0);

  const totalesPorCategoriaCompras = categoriasCompras.map((c) => ({
    categoria: c.nombre,
    etiqueta: CATEGORIA_GASTO_LABEL[c.nombre] ?? c.nombre,
    monto: gastosComprasFiltrados
      .filter((g) => g.categoria === c.nombre)
      .reduce((suma, g) => suma + g.monto, 0),
  })).filter((c) => c.monto > 0);

  const totalesPorColaborador = colaboradores.map((c) => ({
    nombre: c,
    monto: pagosFiltrados.filter((p) => p.colaborador === c).reduce((suma, p) => suma + p.monto, 0),
  }));

  // Gastos por categoria: solo movimientos reales de Caja Menuda -- antes
  // sumaba también el total de Planilla completo bajo la categoría
  // "Planilla" aunque ningún gasto real de Caja Menuda tuviera esa
  // categoría, lo que no cuadraba con el total "GASTOS" de esta misma
  // tarjeta (ese sí es 100% Caja Menuda). El total de Planilla ya se ve
  // aparte, en su propia sección y en "Vista mensual de gastos".
  const totalesPorCategoria = categoriasCajaMenuda.map((c, i) => {
    const deCaja = movimientosFiltrados
      .filter((m) => m.tipo === "gasto" && m.categoria === c)
      .reduce((suma, m) => suma + m.monto, 0);
    return { categoria: c, monto: deCaja, color: COLORES_CATEGORIA[i % COLORES_CATEGORIA.length] };
  });
  const totalSinCategoria = movimientosFiltrados
    .filter((m) => m.tipo === "gasto" && !m.categoria)
    .reduce((suma, m) => suma + m.monto, 0);
  // categoriasConDatos = solo Caja Menuda (alimenta el filtro/desglose de
  // esta tarjeta Y el nuevo gráfico de la tarjeta "Caja Menuda"). El
  // gráfico de esta tarjeta, en cambio, muestra TODAS las categorías de
  // gasto que tengan datos -- Caja Menuda + Compras (pedido del usuario:
  // ya no hay una tarjeta aparte de "Compras — Gastos").
  const categoriasConDatos = totalesPorCategoria.filter((c) => c.monto > 0);
  const barrasCajaMenuda = categoriasConDatos.map((c) => ({ nombre: c.categoria, monto: c.monto, color: c.color }));
  const barrasCompras = totalesPorCategoriaCompras.map((c, i) => ({
    nombre: c.etiqueta,
    monto: c.monto,
    color: COLORES_CATEGORIA[(categoriasConDatos.length + i) % COLORES_CATEGORIA.length],
  }));
  const barrasTodasCategorias = [...barrasCajaMenuda, ...barrasCompras];
  const hayGastosCategorizados = barrasTodasCategorias.length > 0 || totalSinCategoria > 0;
  const montoCategoriaSeleccionada =
    totalesPorCategoria.find((c) => c.categoria === categoriaFiltro)?.monto ?? 0;
  const detalleGastosPorCategoria = movimientosFiltrados.filter(
    (m) => m.tipo === "gasto" && (categoriaFiltro === "" || m.categoria === categoriaFiltro),
  );

  const hayDatosCaja = listo && movimientosFiltrados.length > 0;
  const hayDatosPrestamos = listo && (prestamosFiltrados.length > 0 || totalAbonado > 0);
  const hayAlgunDato =
    listo &&
    (movimientosFiltrados.length > 0 ||
      ventasFiltradas.length > 0 ||
      pagosFiltrados.length > 0 ||
      gastosComprasFiltrados.length > 0 ||
      hayDatosPrestamos);
  const nombreArchivoCaja = "agro-sky-balance-caja-menuda";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Vista mensual de gastos</h2>
            {hayDatosVistaGastos && (
              <BotonDesplegable
                abierto={Boolean(abiertos.vistaGastos)}
                onClick={() => alternar("vistaGastos")}
              />
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
              Año
              <select
                value={añoVista}
                onChange={(e) => setAñoVista(Number(e.target.value))}
                className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
              >
                {añosDisponibles.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
              Mes
              <select
                value={mesVista}
                onChange={(e) => setMesVista(e.target.value)}
                className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
              >
                <option value="">Año completo (Ene–Dic)</option>
                {NOMBRES_MES_LARGO.map((nombre, i) => (
                  <option key={nombre} value={String(i + 1).padStart(2, "0")}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {!hayDatosVistaGastos ? (
          <p className="mt-4 text-sm text-green-700/70 dark:text-green-300/70">
            No hay gastos registrados en {añoVista}.
          </p>
        ) : indiceMesVista === null ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-200 text-xs uppercase tracking-wide text-green-700/70 dark:border-green-800 dark:text-green-300/70">
                  <th className="py-2 pr-4 font-medium">Categoría</th>
                  {NOMBRES_MES.map((m) => (
                    <th key={m} className="py-2 pr-3 text-right font-medium">
                      {m}
                    </th>
                  ))}
                  <th className="py-2 pl-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={14}
                    className="bg-green-50/80 py-1.5 pr-4 text-xs font-semibold uppercase tracking-wide text-green-800 dark:bg-green-950/30 dark:text-green-200"
                  >
                    Gastos Fijos
                  </td>
                </tr>
                {filasFijas.map((f) => (
                  <tr key={f.nombre} className="border-b border-green-50 dark:border-green-950/40">
                    <td className="py-2 pr-4 font-medium text-green-900 dark:text-green-50">{f.etiqueta}</td>
                    {f.montosPorMes.map((monto, i) => (
                      <td key={i} className="py-2 pr-3 text-right text-green-800 dark:text-green-200">
                        {monto > 0 ? formatMoney(monto) : "—"}
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right font-semibold text-red-700 dark:text-red-400">
                      {formatMoney(f.total)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-t border-green-200 dark:border-green-800">
                  <td className="py-2 pr-4 font-semibold text-green-900 dark:text-green-50">Subtotal Fijos</td>
                  {totalesPorMesFijos.map((monto, i) => (
                    <td key={i} className="py-2 pr-3 text-right font-semibold text-green-900 dark:text-green-50">
                      {monto > 0 ? formatMoney(monto) : "—"}
                    </td>
                  ))}
                  <td className="py-2 pl-3 text-right font-semibold text-red-800 dark:text-red-300">
                    {formatMoney(totalFijosGeneral)}
                  </td>
                </tr>

                <tr>
                  <td
                    colSpan={14}
                    className="bg-green-50/80 py-1.5 pr-4 text-xs font-semibold uppercase tracking-wide text-green-800 dark:bg-green-950/30 dark:text-green-200"
                  >
                    Gastos Variables
                  </td>
                </tr>
                {filasVariables.map((f) => (
                  <tr key={f.nombre} className="border-b border-green-50 dark:border-green-950/40">
                    <td className="py-2 pr-4 font-medium text-green-900 dark:text-green-50">{f.etiqueta}</td>
                    {f.montosPorMes.map((monto, i) => (
                      <td key={i} className="py-2 pr-3 text-right text-green-800 dark:text-green-200">
                        {monto > 0 ? formatMoney(monto) : "—"}
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right font-semibold text-red-700 dark:text-red-400">
                      {formatMoney(f.total)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-t border-green-200 dark:border-green-800">
                  <td className="py-2 pr-4 font-semibold text-green-900 dark:text-green-50">Subtotal Variables</td>
                  {totalesPorMesVariables.map((monto, i) => (
                    <td key={i} className="py-2 pr-3 text-right font-semibold text-green-900 dark:text-green-50">
                      {monto > 0 ? formatMoney(monto) : "—"}
                    </td>
                  ))}
                  <td className="py-2 pl-3 text-right font-semibold text-red-800 dark:text-red-300">
                    {formatMoney(totalVariablesGeneral)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-green-200 dark:border-green-800">
                  <td className="py-2 pr-4 font-semibold text-green-900 dark:text-green-50">Total</td>
                  {totalesPorMesGastos.map((monto, i) => (
                    <td key={i} className="py-2 pr-3 text-right font-semibold text-green-900 dark:text-green-50">
                      {monto > 0 ? formatMoney(monto) : "—"}
                    </td>
                  ))}
                  <td className="py-2 pl-3 text-right font-semibold text-red-800 dark:text-red-300">
                    {formatMoney(totalGeneralVistaGastos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="mt-6 max-w-md">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-green-200 text-xs uppercase tracking-wide text-green-700/70 dark:border-green-800 dark:text-green-300/70">
                  <th className="py-2 pr-4 font-medium">Categoría</th>
                  <th className="py-2 pl-3 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={2}
                    className="bg-green-50/80 py-1.5 pr-4 text-xs font-semibold uppercase tracking-wide text-green-800 dark:bg-green-950/30 dark:text-green-200"
                  >
                    Gastos Fijos
                  </td>
                </tr>
                {filasFijas.map((f) => (
                  <tr key={f.nombre} className="border-b border-green-50 dark:border-green-950/40">
                    <td className="py-2 pr-4 text-green-900 dark:text-green-50">{f.etiqueta}</td>
                    <td className="py-2 pl-3 text-right text-green-800 dark:text-green-200">
                      {formatMoney(f.montosPorMes[indiceMesVista])}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-t border-green-200 dark:border-green-800">
                  <td className="py-2 pr-4 font-semibold text-green-900 dark:text-green-50">Subtotal Fijos</td>
                  <td className="py-2 pl-3 text-right font-semibold text-red-700 dark:text-red-400">
                    {formatMoney(totalesPorMesFijos[indiceMesVista])}
                  </td>
                </tr>

                <tr>
                  <td
                    colSpan={2}
                    className="bg-green-50/80 py-1.5 pr-4 text-xs font-semibold uppercase tracking-wide text-green-800 dark:bg-green-950/30 dark:text-green-200"
                  >
                    Gastos Variables
                  </td>
                </tr>
                {filasVariables.map((f) => (
                  <tr key={f.nombre} className="border-b border-green-50 dark:border-green-950/40">
                    <td className="py-2 pr-4 text-green-900 dark:text-green-50">{f.etiqueta}</td>
                    <td className="py-2 pl-3 text-right text-green-800 dark:text-green-200">
                      {formatMoney(f.montosPorMes[indiceMesVista])}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-t border-green-200 dark:border-green-800">
                  <td className="py-2 pr-4 font-semibold text-green-900 dark:text-green-50">Subtotal Variables</td>
                  <td className="py-2 pl-3 text-right font-semibold text-red-700 dark:text-red-400">
                    {formatMoney(totalesPorMesVariables[indiceMesVista])}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-green-200 dark:border-green-800">
                  <td className="py-2 pr-4 font-semibold text-green-900 dark:text-green-50">Total</td>
                  <td className="py-2 pl-3 text-right font-semibold text-red-800 dark:text-red-300">
                    {formatMoney(totalesPorMesGastos[indiceMesVista])}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {abiertos.vistaGastos && hayDatosVistaGastos && (
          <div className="mt-4 border-t border-green-100 pt-4 dark:border-green-900/40">
            <TablaDetalle
              columnas={[
                { header: "Fecha", render: (f: FilaDetalleGasto) => formatDateOnly(f.fecha) },
                { header: "Origen", render: (f: FilaDetalleGasto) => f.origen },
                { header: "Categoría", render: (f: FilaDetalleGasto) => f.categoria },
                { header: "Monto", render: (f: FilaDetalleGasto) => formatMoney(f.monto), alinDerecha: true },
              ]}
              filas={detalleVistaGastos}
              clave={(f, i) => `${f.fecha}-${f.origen}-${i}`}
              vacio="No hay gastos para este período."
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">
            Ingresos y Egresos — {añoVista}
          </h2>
          {hayDatosLineaAnual && (
            <BotonDesplegable abierto={Boolean(abiertos.lineaAnual)} onClick={() => alternar("lineaAnual")} />
          )}
        </div>

        {!hayDatosLineaAnual ? (
          <p className="mt-4 text-sm text-green-700/70 dark:text-green-300/70">
            No hay ingresos ni egresos registrados en {añoVista}.
          </p>
        ) : (
          <div className="mt-4">
            <GraficaLineasAnual datos={datosLineaAnual} />
          </div>
        )}

        {abiertos.lineaAnual && hayDatosLineaAnual && (
          <div className="mt-4 border-t border-green-100 pt-4 dark:border-green-900/40">
            <TablaDetalle
              columnas={[
                { header: "Mes", render: (d: PuntoLineaAnual) => d.mesLargo },
                { header: "Ingresos", render: (d: PuntoLineaAnual) => formatMoney(d.ingresos), alinDerecha: true },
                { header: "Egresos", render: (d: PuntoLineaAnual) => formatMoney(d.egresos), alinDerecha: true },
                { header: "Neto", render: (d: PuntoLineaAnual) => formatMoney(d.neto), alinDerecha: true },
              ]}
              filas={datosLineaAnual}
              clave={(d) => d.mes}
              vacio="No hay datos para este año."
            />
          </div>
        )}
      </div>

      {!listo ? (
        <p className="text-sm text-green-700/70 dark:text-green-300/70">
          Selecciona una fecha de inicio y una de fin.
        </p>
      ) : !hayAlgunDato ? (
        <p className="text-sm text-green-700/70 dark:text-green-300/70">
          No hay movimientos de dinero para este período.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">
                  Gastos por categoría
                </h2>
                <BotonDesplegable
                  abierto={Boolean(abiertos.gastosPorCategoria)}
                  onClick={() => alternar("gastosPorCategoria")}
                />
              </div>
              <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
                Categoría
                <select
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                  className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
                >
                  <option value="">Todas</option>
                  {categoriasCajaMenuda.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {categoriaFiltro === "" ? (
              !hayGastosCategorizados ? (
                <p className="mt-4 text-sm text-green-700/70 dark:text-green-300/70">
                  No hay gastos categorizados para este período.
                </p>
              ) : (
                <>
                  <div className="mt-4">
                    <GraficaDosBarras datos={barrasTodasCategorias} altura="h-48" />
                  </div>
                  {totalSinCategoria > 0 && (
                    <p className="mt-3 text-xs text-green-700/60 dark:text-green-300/60">
                      Además, {formatMoney(totalSinCategoria)} en gastos de Caja Menuda sin
                      categoría (registrados antes de que existiera este campo).
                    </p>
                  )}
                </>
              )
            ) : (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                  {categoriaFiltro}
                </p>
                <p className="text-2xl font-semibold text-red-700 dark:text-red-400">
                  {formatMoney(montoCategoriaSeleccionada)}
                </p>
              </div>
            )}

            {abiertos.gastosPorCategoria && (
              <div className="mt-4 border-t border-green-100 pt-4 dark:border-green-900/40">
                <TablaDetalle
                  columnas={[
                    { header: "Fecha", render: (m: MovimientoExportable) => formatDateOnly(m.fecha) },
                    { header: "Categoría", render: (m: MovimientoExportable) => m.categoria ?? "Sin categoría" },
                    { header: "Nombre", render: (m: MovimientoExportable) => m.nombre ?? "—" },
                    { header: "Monto", render: (m: MovimientoExportable) => formatMoney(m.monto), alinDerecha: true },
                  ]}
                  filas={detalleGastosPorCategoria}
                  clave={(m, i) => `${m.fecha}-${i}`}
                  vacio="No hay gastos categorizados para este período."
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Caja Menuda</h2>
                <BotonDesplegable abierto={Boolean(abiertos.cajaMenuda)} onClick={() => alternar("cajaMenuda")} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportarMovimientosExcel(movimientosFiltrados, nombreArchivoCaja)}
                  disabled={!hayDatosCaja}
                  className="rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
                >
                  Exportar Excel
                </button>
                <button
                  onClick={() =>
                    exportarMovimientosPDF(movimientosFiltrados, nombreArchivoCaja, "Balance — Caja Menuda")
                  }
                  disabled={!hayDatosCaja}
                  className="rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-40 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
                >
                  Exportar PDF
                </button>
              </div>
            </div>

            {!hayDatosCaja ? (
              <p className="mt-4 text-sm text-green-700/70 dark:text-green-300/70">
                No hay movimientos de Caja Menuda para este período.
              </p>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                      Reposiciones
                    </p>
                    <p className="text-xl font-semibold text-green-700 dark:text-green-400">
                      {formatMoney(totalReposiciones)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                      Gastos
                    </p>
                    <p className="text-xl font-semibold text-red-700 dark:text-red-400">
                      {formatMoney(totalGastosCaja)}
                    </p>
                  </div>
                </div>

                {barrasCajaMenuda.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                      Gastos por categoría
                    </p>
                    <GraficaDosBarras datos={barrasCajaMenuda} altura="h-56" />
                  </div>
                )}
              </>
            )}

            {abiertos.cajaMenuda && hayDatosCaja && (
              <div className="mt-4 border-t border-green-100 pt-4 dark:border-green-900/40">
                <TablaDetalle
                  columnas={[
                    { header: "Fecha", render: (m: MovimientoExportable) => formatDateOnly(m.fecha) },
                    { header: "Tipo", render: (m: MovimientoExportable) => (m.tipo === "gasto" ? "Gasto" : "Reposición") },
                    { header: "Categoría", render: (m: MovimientoExportable) => m.categoria ?? "—" },
                    { header: "Nombre / Nota", render: (m: MovimientoExportable) => m.nombre ?? m.nota ?? "—" },
                    { header: "Monto", render: (m: MovimientoExportable) => formatMoney(m.monto), alinDerecha: true },
                  ]}
                  filas={movimientosFiltrados}
                  clave={(m, i) => `${m.tipo}-${m.fecha}-${i}`}
                  vacio="No hay movimientos de Caja Menuda para este período."
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Ventas</h2>
              {ventasFiltradas.length > 0 && (
                <BotonDesplegable abierto={Boolean(abiertos.ventas)} onClick={() => alternar("ventas")} />
              )}
            </div>

            {ventasFiltradas.length === 0 ? (
              <p className="mt-4 text-sm text-green-700/70 dark:text-green-300/70">
                No hay ventas para este período.
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Total de ventas
                  </p>
                  <p className="text-xl font-semibold text-green-700 dark:text-green-400">
                    {formatMoney(totalVentas)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    ITBMS cobrado
                  </p>
                  <p className="text-xl font-semibold text-green-900 dark:text-green-50">
                    {formatMoney(totalItbms)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Total facturado
                  </p>
                  <p className="text-xl font-semibold text-green-900 dark:text-green-50">
                    {formatMoney(totalVentas + totalItbms)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Ventas registradas
                  </p>
                  <p className="text-xl font-semibold text-green-900 dark:text-green-50">
                    {ventasFiltradas.length}
                  </p>
                </div>
              </div>
            )}

            {abiertos.ventas && ventasFiltradas.length > 0 && (
              <div className="mt-4 border-t border-green-100 pt-4 dark:border-green-900/40">
                <TablaDetalle
                  columnas={[
                    { header: "Fecha", render: (v: VentaBalance) => formatDateOnly(v.fecha) },
                    { header: "Ingreso", render: (v: VentaBalance) => formatMoney(v.ingreso), alinDerecha: true },
                    { header: "ITBMS", render: (v: VentaBalance) => formatMoney(v.itbms), alinDerecha: true },
                    {
                      header: "Total facturado",
                      render: (v: VentaBalance) => formatMoney(v.ingreso + v.itbms),
                      alinDerecha: true,
                    },
                  ]}
                  filas={ventasFiltradas}
                  clave={(v, i) => `${v.fecha}-${i}`}
                  vacio="No hay ventas para este período."
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Planilla</h2>
              {pagosFiltrados.length > 0 && (
                <BotonDesplegable abierto={Boolean(abiertos.planilla)} onClick={() => alternar("planilla")} />
              )}
            </div>

            {pagosFiltrados.length === 0 ? (
              <p className="mt-4 text-sm text-green-700/70 dark:text-green-300/70">
                No hay pagos de planilla para este período.
              </p>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {totalesPorColaborador.map((c) => (
                    <div key={c.nombre}>
                      <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                        {c.nombre}
                      </p>
                      <p className="text-lg font-semibold text-green-900 dark:text-green-50">
                        {formatMoney(c.monto)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 inline-block rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-center dark:border-red-900/40 dark:bg-red-950/20">
                  <p className="text-xs font-medium uppercase tracking-wide text-red-700 dark:text-red-400">
                    Total pagado en planilla
                  </p>
                  <p className="text-lg font-semibold text-red-900 dark:text-red-100">
                    {formatMoney(totalPlanilla)}
                  </p>
                </div>
              </>
            )}

            {abiertos.planilla && pagosFiltrados.length > 0 && (
              <div className="mt-4 border-t border-green-100 pt-4 dark:border-green-900/40">
                <TablaDetalle
                  columnas={[
                    { header: "Fecha", render: (p: PagoPlanillaBalance) => formatDateOnly(p.fecha) },
                    { header: "Colaborador", render: (p: PagoPlanillaBalance) => p.colaborador },
                    { header: "Monto pagado", render: (p: PagoPlanillaBalance) => formatMoney(p.monto), alinDerecha: true },
                    {
                      header: "Abono préstamo",
                      render: (p: PagoPlanillaBalance) => (p.montoPrestamo > 0 ? formatMoney(p.montoPrestamo) : "—"),
                      alinDerecha: true,
                    },
                  ]}
                  filas={pagosFiltrados}
                  clave={(p, i) => `${p.fecha}-${p.colaborador}-${i}`}
                  vacio="No hay pagos de planilla para este período."
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">Préstamos</h2>
              {hayDatosPrestamos && (
                <BotonDesplegable abierto={Boolean(abiertos.prestamos)} onClick={() => alternar("prestamos")} />
              )}
            </div>
            <p className="mt-1 text-xs text-green-700/60 dark:text-green-300/60">
              Préstamos de la empresa a colaboradores -- no cuentan como Ingreso ni Egreso arriba (es
              plata que la empresa ya tenía, no gasto nuevo); lo que sí reduce el gasto real de Planilla
              es lo que se va abonando cada quincena.
            </p>

            {!hayDatosPrestamos ? (
              <p className="mt-4 text-sm text-green-700/70 dark:text-green-300/70">
                No hay préstamos ni abonos para este período.
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Prestado en el período
                  </p>
                  <p className="text-xl font-semibold text-green-900 dark:text-green-50">
                    {formatMoney(totalPrestado)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Abonado en el período
                  </p>
                  <p className="text-xl font-semibold text-green-900 dark:text-green-50">
                    {formatMoney(totalAbonado)}
                  </p>
                </div>
              </div>
            )}

            {abiertos.prestamos && hayDatosPrestamos && (
              <div className="mt-4 flex flex-col gap-4 border-t border-green-100 pt-4 dark:border-green-900/40">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Préstamos otorgados
                  </p>
                  <TablaDetalle
                    columnas={[
                      { header: "Fecha", render: (p: PrestamoBalance) => formatDateOnly(p.fecha) },
                      { header: "Monto", render: (p: PrestamoBalance) => formatMoney(p.monto), alinDerecha: true },
                    ]}
                    filas={prestamosFiltrados}
                    clave={(p, i) => `${p.fecha}-${i}`}
                    vacio="No hay préstamos otorgados en este período."
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                    Abonos recibidos (descontados en Planilla)
                  </p>
                  <TablaDetalle
                    columnas={[
                      { header: "Fecha", render: (p: PagoPlanillaBalance) => formatDateOnly(p.fecha) },
                      { header: "Colaborador", render: (p: PagoPlanillaBalance) => p.colaborador },
                      { header: "Abono", render: (p: PagoPlanillaBalance) => formatMoney(p.montoPrestamo), alinDerecha: true },
                    ]}
                    filas={abonosFiltrados}
                    clave={(p, i) => `${p.fecha}-${p.colaborador}-${i}`}
                    vacio="No hay abonos en este período."
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
