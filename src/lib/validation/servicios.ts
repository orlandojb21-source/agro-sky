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

// El código (columna "nombre") ya no lo escribe el usuario -- se genera
// solo (ASPS-001) con un trigger en la base de datos al insertar (ver
// migracion 0025). No forma parte de este schema.
export const servicioSchema = z.object({
  descripcion: z.string().trim().optional().default(""),
  costo: numeroOpcionalNoNegativo("El costo no puede ser negativo"),
  precio: numeroOpcionalNoNegativo("El precio no puede ser negativo"),
});

export const servicioEditSchema = servicioSchema.extend({
  id: z.string().uuid(),
});
