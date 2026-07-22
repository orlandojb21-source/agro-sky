import { z } from "zod";

// Igual que en Caja Menuda: vacio -> null (no se llenó), en vez de que
// z.coerce.number() convierta "" en 0 -- costo/precio son solo una
// referencia opcional, no todos los servicios tienen uno definido de
// entrada.
function numeroOpcionalNoNegativo(mensaje: string) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === "" ? null : Number(v)))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), mensaje);
}

export const servicioSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido"),
  descripcion: z.string().trim().optional().default(""),
  costo: numeroOpcionalNoNegativo("El costo no puede ser negativo"),
  precio: numeroOpcionalNoNegativo("El precio no puede ser negativo"),
});

export const servicioEditSchema = servicioSchema.extend({
  id: z.string().uuid(),
});
