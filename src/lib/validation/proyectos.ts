import { z } from "zod";
import { CATEGORIAS_GASTO_OPERATIVO } from "@/lib/proyectoGastos";

const VALORES_CATEGORIA_GASTO_OPERATIVO = CATEGORIAS_GASTO_OPERATIVO.map((c) => c.valor) as [string, ...string[]];

// Igual que en Caja Menuda/Servicios: vacio -> null (no se llenó), en vez
// de que z.coerce.number() convierta "" en 0 -- estos campos del
// encabezado se llenan a mano y no siempre se conocen de entrada.
function numeroOpcionalNoNegativo(mensaje: string) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === "" ? null : Number(v)))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), mensaje);
}

export const filaProyectoSchema = z.object({
  drone: z.string().trim().min(1, "Falta el nombre del drone/empresa"),
  hectareas: z.number().min(0, "No puede ser negativo").default(0),
  precio: z.number().min(0, "No puede ser negativo").default(0),
});

export const itemGastoOperativoSchema = z.object({
  categoria: z.enum(VALORES_CATEGORIA_GASTO_OPERATIVO),
  cantidad: z.number().min(0, "No puede ser negativo").default(0),
  precio: z.number().min(0, "No puede ser negativo").default(0),
});

export const bloqueGastoOperativoSchema = z.object({
  drone: z.string().trim().min(1, "Falta el nombre del drone para los gastos operativos"),
  operador: z.string().trim().optional().default(""),
  ayudantes: z.array(z.string().trim().min(1)).default([]),
  items: z.array(itemGastoOperativoSchema).default([]),
});

// Base sin el refine de fechas -- separada para poder reutilizarla tanto en
// el schema de creación como en el de edición (extend() no funciona sobre
// el resultado de un .refine(), hay que extenderla antes).
const informeProyectoBaseSchema = z.object({
  // El Proyecto se elige del catálogo -- Cliente, texto de encabezado y
  // Hectáreas se derivan siempre en el servidor a partir de proyectoId
  // (ver crear_informe_proyecto/editar_informe_proyecto), nunca de lo que
  // mande el navegador.
  proyectoId: z.string().uuid("Selecciona un proyecto"),
  ubicacion: z.string().trim().optional().default(""),
  precio: numeroOpcionalNoNegativo("El precio no puede ser negativo"),
  fechaDesde: z.string().min(1, "Fecha desde requerida"),
  fechaHasta: z.string().min(1, "Fecha hasta requerida"),
  filas: z.array(filaProyectoSchema).default([]),
  gastosOperativos: z.array(bloqueGastoOperativoSchema).default([]),
});

const fechasEnOrden = (data: { fechaDesde: string; fechaHasta: string }) => data.fechaHasta >= data.fechaDesde;
const fechasEnOrdenOpciones = {
  message: "La fecha hasta debe ser igual o posterior a la fecha desde",
  path: ["fechaHasta"],
};

export const informeProyectoSchema = informeProyectoBaseSchema.refine(fechasEnOrden, fechasEnOrdenOpciones);

export const informeProyectoEditSchema = informeProyectoBaseSchema
  .extend({ id: z.string().uuid() })
  .refine(fechasEnOrden, fechasEnOrdenOpciones);
