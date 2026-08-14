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

// El Drone y las Hectáreas de cada fila se recalculan siempre en el
// servidor a partir del Informe de Campo (ver crear_informe_proyecto) --
// desde el navegador solo viaja el Precio que se le puso a cada uno.
export const filaProyectoSchema = z.object({
  informeCampoId: z.string().uuid(),
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

export const informeProyectoSchema = z.object({
  // El Proyecto se elige del catálogo -- Cliente, texto de encabezado,
  // Hectáreas y Total se derivan siempre en el servidor a partir de
  // proyectoId (ver crear_informe_proyecto/editar_informe_proyecto), nunca
  // de lo que mande el navegador. La fecha tampoco se manda: al crear
  // queda como la fecha actual, y al editar no se toca.
  proyectoId: z.string().uuid("Selecciona un proyecto"),
  ubicacion: z.string().trim().optional().default(""),
  precio: numeroOpcionalNoNegativo("El precio no puede ser negativo"),
  filas: z.array(filaProyectoSchema).default([]),
  gastosOperativos: z.array(bloqueGastoOperativoSchema).default([]),
});

export const informeProyectoEditSchema = informeProyectoSchema.extend({ id: z.string().uuid() });
