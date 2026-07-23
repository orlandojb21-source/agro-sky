import { z } from "zod";
import { COLABORADORES } from "@/lib/planilla";

export const pagoSchema = z.object({
  colaborador: z.enum(COLABORADORES),
  fecha: z.string().min(1, "Fecha requerida"),
  descripcion: z.string().trim().min(1, "Descripción requerida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
});

export const pagoEditSchema = pagoSchema.extend({
  id: z.string().uuid(),
});
