import { z } from "zod";

// tipoTrabajo/jornada solo aplican a colaboradores de Campo (pago por dia)
// -- para colaboradores Fijos llegan vacios y se guardan como null. Son
// clasificacion para reportes, no afectan el monto (que se sigue escribiendo
// a mano en ambos casos).
export const pagoSchema = z.object({
  colaborador: z.string().trim().min(1, "Selecciona un colaborador"),
  fecha: z.string().min(1, "Fecha requerida"),
  descripcion: z.string().trim().min(1, "Descripción requerida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  tipoTrabajo: z.enum(["proyecto", "taller"]).optional().or(z.literal("")),
  jornada: z.enum(["completo", "medio"]).optional().or(z.literal("")),
});

export const pagoEditSchema = pagoSchema.extend({
  id: z.string().uuid(),
});
