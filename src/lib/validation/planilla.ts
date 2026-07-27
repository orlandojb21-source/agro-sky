import { z } from "zod";

export const pagoSchema = z.object({
  colaborador: z.string().trim().min(1, "Selecciona un colaborador"),
  fecha: z.string().min(1, "Fecha requerida"),
  descripcion: z.string().trim().min(1, "Descripción requerida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
});

export const pagoEditSchema = pagoSchema.extend({
  id: z.string().uuid(),
});
