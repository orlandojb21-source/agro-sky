import { CATEGORIA_GASTO_LABEL } from "@/lib/validation/gastos";

// Las 7 categorías fijas de un bloque de Gastos Operativos (segundo cuadro
// del informe de Proyectos) -- mismo patrón que CATEGORIAS_GASTO/
// DENOMINACIONES: la lista vive en un solo lugar y tanto el formulario
// como la validación/exportación la referencian desde aquí.
export const CATEGORIAS_GASTO_OPERATIVO = [
  { valor: "diesel", etiqueta: "Diésel" },
  { valor: "gasolina", etiqueta: "Gasolina 91" },
  { valor: "viaticos", etiqueta: "Viáticos" },
  { valor: "planilla", etiqueta: "Planilla" },
  { valor: "alquiler_drone", etiqueta: "Alquiler Drone" },
  { valor: "alquiler_carro", etiqueta: "Alquiler de Carro" },
  { valor: "lavado_carro", etiqueta: "Lavado de Carro" },
] as const;

export type CategoriaGastoOperativo = (typeof CATEGORIAS_GASTO_OPERATIVO)[number]["valor"];

// Texto para mostrar el Equipo de Campo (Operador + Ayudantes) de un bloque
// de Gastos Operativos, usado tanto en el detalle del informe como en el
// PDF exportado -- un solo lugar para no repetir el formato en los dos.
export function textoEquipoDeCampo(operador: string | null, ayudantes: string[]): string {
  const partes: string[] = [];
  if (operador) partes.push(`Operador: ${operador}`);
  if (ayudantes.length > 0) partes.push(`Ayudantes: ${ayudantes.join(", ")}`);
  return partes.join(" — ");
}

// Gastos de Caja Menuda o de Compras > Gastos que el usuario asoció a un
// Proyecto al registrarlos (campo "Proyecto", ambos opcionales -- ver
// migraciones 0088/0089). No se encajan en las 7 categorías fijas de
// arriba (sus propias categorías no siempre coinciden, y no siempre hay un
// equipo claro detrás) -- se muestran aparte, como lista de solo lectura,
// y su suma entra al Total de Gastos Operativos. Es 100% en vivo (no se
// guarda una copia al crear el Análisis): si después se edita o borra el
// gasto original, el Análisis refleja el estado actual.
export type GastoProyectoRegistrado = {
  id: string;
  origen: "caja_menuda" | "compras";
  fecha: string;
  categoria: string;
  descripcion: string;
  monto: number;
};

type FilaCajaGastoProyecto = { id: string; fecha: string; categoria: string | null; monto: number; concepto: string | null };
type FilaGastoCompraProyecto = {
  id: string;
  fecha: string;
  categoria: string;
  categoria_otro: string | null;
  monto: number;
  descripcion: string | null;
};

export function mapearGastosProyecto(
  cajaGastos: FilaCajaGastoProyecto[],
  gastosCompras: FilaGastoCompraProyecto[],
): GastoProyectoRegistrado[] {
  const deCaja: GastoProyectoRegistrado[] = cajaGastos.map((g) => ({
    id: g.id,
    origen: "caja_menuda",
    fecha: g.fecha,
    categoria: g.categoria ?? "Sin categoría",
    descripcion: g.concepto ?? "",
    monto: Number(g.monto),
  }));
  const deCompras: GastoProyectoRegistrado[] = gastosCompras.map((g) => ({
    id: g.id,
    origen: "compras",
    fecha: g.fecha,
    categoria: g.categoria === "otro" ? (g.categoria_otro ?? "Otro") : (CATEGORIA_GASTO_LABEL[g.categoria] ?? g.categoria),
    descripcion: g.descripcion ?? "",
    monto: Number(g.monto),
  }));
  return [...deCaja, ...deCompras].sort((a, b) => a.fecha.localeCompare(b.fecha));
}
