import { z } from "zod";

export const gastoSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  nombre: z.string().trim().min(1, "El nombre de quien recibe el dinero es requerido"),
  concepto: z.string().trim().min(1, "Concepto requerido"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  colaborador: z.string().trim().optional().default(""),
  nota: z.string().trim().optional().default(""),
});

export const reposicionSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  nota: z.string().trim().optional().default(""),
});

export const previstoSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  colaborador: z.string().trim().min(1, "El nombre del colaborador es requerido"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
});
