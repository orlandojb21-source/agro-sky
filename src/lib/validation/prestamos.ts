import { z } from "zod";

const prestamoBase = z.object({
  colaborador: z.string().trim().min(1, "Colaborador requerido"),
  fecha: z.string().trim().min(1, "Fecha requerida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  cuotaQuincenal: z.coerce.number().positive("La cuota quincenal debe ser mayor a 0"),
  nota: z.string().trim().optional().default(""),
});

export const prestamoSchema = prestamoBase;

export const prestamoEditSchema = prestamoBase.extend({ id: z.string().uuid() });
