// Categorías de gasto compartidas entre Caja Menuda y Planilla (y Compras
// cuando exista), para poder filtrar y ver el gasto por categoría en
// Balance sin importar de dónde salió el dinero. Lista fija por ahora,
// confirmada con el usuario -- si el negocio necesita más categorías más
// adelante, se ajusta aquí (y en el check de las migraciones que la usan).
export const CATEGORIAS_GASTO = [
  "Combustible",
  "Viáticos",
  "Insumos de Oficina",
  "Insumos de Limpieza",
  "Planilla",
  "Taller",
  "Alquiler",
  "Generadores",
  "Comida Proyecto",
  "Comida",
  "Hielo",
  "Bidones",
  "Diésel",
  "Combustible Extra",
  "Gastos Extras",
  "Otro",
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];
