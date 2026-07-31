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
