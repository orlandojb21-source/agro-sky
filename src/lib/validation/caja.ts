import { z } from "zod";
import { DENOMINACIONES } from "@/lib/caja";

// Convierte un campo de texto opcional de un <input type="number"> en
// number|null: vacio -> null (no se llenó), en vez de que z.coerce.number()
// convierta "" en 0 (lo que rompería el check > 0 en la base de datos para
// un campo que el usuario simplemente dejó en blanco).
function numeroOpcionalPositivo(mensaje: string) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === "" ? null : Number(v)))
    .refine((v) => v === null || (!Number.isNaN(v) && v > 0), mensaje);
}

function numeroOpcionalNoNegativo(mensaje: string) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === "" ? null : Number(v)))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), mensaje);
}

// Un "movimiento" es un gasto simple (nombre/concepto/monto) o una entrega
// de previsto/viaticos (colaborador/previsto/entregado/vuelto) -- todos los
// campos son opcionales, se guarda con cualquier combinacion que se llene.
export const gastoSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  nombre: z.string().trim().optional().default(""),
  concepto: z.string().trim().optional().default(""),
  monto: numeroOpcionalPositivo("El monto debe ser mayor a cero"),
  colaborador: z.string().trim().optional().default(""),
  previsto: numeroOpcionalPositivo("El previsto debe ser mayor a cero"),
  entregado: numeroOpcionalPositivo("El entregado debe ser mayor a cero"),
  vuelto: numeroOpcionalNoNegativo("El vuelto no puede ser negativo"),
  nota: z.string().trim().optional().default(""),
});

export const gastoEditSchema = gastoSchema.extend({
  id: z.string().uuid(),
});

export const reposicionSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  nota: z.string().trim().optional().default(""),
});

export const reposicionEditSchema = reposicionSchema.extend({
  id: z.string().uuid(),
});

export const vueltoSchema = z.object({
  vuelto: z.coerce.number().min(0, "El vuelto no puede ser negativo"),
});

const camposCantidadPorDenominacion = Object.fromEntries(
  DENOMINACIONES.map((d) => [
    `cantidad_${d.id}`,
    z.coerce.number().int("Debe ser un número entero").min(0, "No puede ser negativo").default(0),
  ]),
);

export const arqueoSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  nota: z.string().trim().optional().default(""),
  ...camposCantidadPorDenominacion,
});
