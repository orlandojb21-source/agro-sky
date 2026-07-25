import { z } from "zod";
import { SLOTS_OPERACION, ROLES_PERSONAL } from "@/lib/proyectos";

// Igual que con Ventas: los montos se recalculan/revalidan siempre en el
// servidor (funcion crear_informe_proyecto en Postgres) -- aqui solo se
// valida la forma de los datos.

export const tramoSchema = z.object({
  hectareas: z.number().positive("Las hectáreas deben ser mayores a cero"),
  precio: z.number().min(0, "El precio no puede ser negativo"),
});

export const operacionSchema = z.object({
  slot: z.enum(SLOTS_OPERACION),
  operador: z.string().trim().optional().default(""),
  diesel: z.number().min(0, "No puede ser negativo").default(0),
  gasolina: z.number().min(0, "No puede ser negativo").default(0),
  viaticos: z.number().min(0, "No puede ser negativo").default(0),
  planilla: z.number().min(0, "No puede ser negativo").default(0),
  alquilerDrone: z.number().min(0, "No puede ser negativo").default(0),
  alquilerCarro: z.number().min(0, "No puede ser negativo").default(0),
  lavadoCarro: z.number().min(0, "No puede ser negativo").default(0),
  tramos: z.array(tramoSchema).default([]),
});

export const personalDiaSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  monto: z.number().min(0, "El monto no puede ser negativo"),
});

export const personalSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre de la persona"),
  rol: z.enum(ROLES_PERSONAL),
  dias: z.array(personalDiaSchema).default([]),
});

// precioReferencia: vacio -> null (no se llenó, es solo informativo), en
// vez de que z.coerce.number() convierta "" en 0 -- mismo patron que
// numeroOpcionalNoNegativo en lib/validation/servicios.ts, pero aqui el
// action ya convierte el string a number|null antes de llegar a este
// schema (ver crearInformeProyectoAction).
export const informeProyectoSchema = z
  .object({
    proyecto: z.string().trim().min(1, "Nombre del proyecto requerido"),
    ubicacion: z.string().trim().optional().default(""),
    fechaDesde: z.string().min(1, "Fecha desde requerida"),
    fechaHasta: z.string().min(1, "Fecha hasta requerida"),
    precioReferencia: z.number().min(0, "No puede ser negativo").nullable().default(null),
    operaciones: z.array(operacionSchema).length(4, "Faltan operaciones en el informe"),
    personal: z.array(personalSchema).default([]),
  })
  .refine((data) => data.fechaHasta >= data.fechaDesde, {
    message: "La fecha hasta debe ser igual o posterior a la fecha desde",
    path: ["fechaHasta"],
  });
