import { z } from "zod";

const controlHorarioBase = z.object({
  colaborador: z.string().trim().min(1, "Colaborador requerido"),
  fecha: z.string().trim().min(1, "Fecha requerida"),
  // Llega como "si"/"no" de un <select> (no un checkbox HTML) para forzar
  // una elección explícita en vez de un valor "sin marcar" ambiguo.
  cumplio: z.enum(["si", "no"], { message: "Selecciona si cumplió o no" }).transform((v) => v === "si"),
  nota: z.string().trim().optional().default(""),
});

export const controlHorarioSchema = controlHorarioBase;

export const controlHorarioEditSchema = z.object({
  id: z.string().uuid(),
  colaborador: z.string().trim().min(1, "Colaborador requerido"),
  fecha: z.string().trim().min(1, "Fecha requerida"),
  cumplio: z.enum(["si", "no"], { message: "Selecciona si cumplió o no" }).transform((v) => v === "si"),
  nota: z.string().trim().optional().default(""),
});
