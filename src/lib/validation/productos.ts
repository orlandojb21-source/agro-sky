import { z } from "zod";

export const productoCreateSchema = z.object({
  tipo: z.enum(["nuevo", "usado"]),
  numeroParte: z.string().trim().min(1, "Número de parte requerido"),
  descripcion: z.string().trim().min(1, "Descripción requerida"),
  cantidad: z.coerce
    .number()
    .int("La cantidad debe ser un número entero")
    .min(0, "La cantidad no puede ser negativa")
    .default(0),
  costo: z.coerce.number().min(0, "El costo no puede ser negativo").default(0),
  venta: z.coerce
    .number()
    .min(0, "El precio de venta no puede ser negativo")
    .default(0),
  rack: z.string().trim().optional().default(""),
  contenedor: z.string().trim().optional().default(""),
  unidad: z.string().trim().optional().default(""),
});

export const productoUpdateSchema = productoCreateSchema.extend({
  id: z.string().uuid(),
});
