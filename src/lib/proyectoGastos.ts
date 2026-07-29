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
