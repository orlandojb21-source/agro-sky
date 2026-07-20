import { notFound } from "next/navigation";

export type TipoProducto = "nuevo" | "usado";

const SEGMENTO_A_TIPO: Record<string, TipoProducto> = {
  nuevos: "nuevo",
  usados: "usado",
};

const TIPO_A_ETIQUETA: Record<TipoProducto, string> = {
  nuevo: "Nuevos",
  usado: "Usados",
};

/** Convierte el segmento de URL (/inventario/nuevos o /inventario/usados)
 * al valor guardado en la base de datos, o dispara 404 si no es valido. */
export function tipoDesdeSegmento(segmento: string): TipoProducto {
  const tipo = SEGMENTO_A_TIPO[segmento];
  if (!tipo) notFound();
  return tipo;
}

export function segmentoDesdeTipo(tipo: TipoProducto): string {
  return tipo === "nuevo" ? "nuevos" : "usados";
}

export function etiquetaDeTipo(tipo: TipoProducto): string {
  return TIPO_A_ETIQUETA[tipo];
}
