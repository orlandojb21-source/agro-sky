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

// Campos "{prefijo}_{id}" para una grilla de denominaciones (DenominacionGrid):
// cuantos billetes/monedas de cada tipo se marcaron. El total en dolares y el
// jsonb de detalle se calculan aparte a partir de estos mismos campos (ver
// detalleDesdeFormData en lib/caja.ts) -- aqui solo se valida que cada
// cantidad sea un entero no negativo.
function camposCantidadPorDenominacion(prefijo: string) {
  return Object.fromEntries(
    DENOMINACIONES.map((d) => [
      `${prefijo}_${d.id}`,
      z.coerce.number().int("Debe ser un número entero").min(0, "No puede ser negativo").default(0),
    ]),
  );
}

// Un "movimiento" es un gasto simple (nombre/concepto/monto) o una entrega
// de previsto/viaticos (colaborador/previsto/entregado/vuelto) -- todos los
// campos son opcionales, se guarda con cualquier combinacion que se llene.
// "monto", "entregado" y "vuelto" se registran por denominacion (billetes y
// monedas); "previsto" es solo un estimado del dia, no dinero fisico
// entregado, asi que se queda como un monto simple en dolares.
export const gastoSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  nombre: z.string().trim().optional().default(""),
  concepto: z.string().trim().optional().default(""),
  colaborador: z.string().trim().optional().default(""),
  previsto: numeroOpcionalPositivo("El previsto debe ser mayor a cero"),
  nota: z.string().trim().optional().default(""),
  ...camposCantidadPorDenominacion("monto"),
  ...camposCantidadPorDenominacion("entregado"),
  ...camposCantidadPorDenominacion("vuelto"),
});

export const gastoEditSchema = gastoSchema.extend({
  id: z.string().uuid(),
});

export const reposicionSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  nota: z.string().trim().optional().default(""),
  ...camposCantidadPorDenominacion("monto"),
});

export const reposicionEditSchema = reposicionSchema.extend({
  id: z.string().uuid(),
});

export const vueltoSchema = z.object({
  ...camposCantidadPorDenominacion("vuelto"),
});

export const arqueoSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  nota: z.string().trim().optional().default(""),
  ...camposCantidadPorDenominacion("cantidad"),
});
