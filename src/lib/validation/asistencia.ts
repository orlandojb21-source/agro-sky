import { z } from "zod";
import { jornadaCoincideConTipoTrabajo } from "@/lib/validation/planilla";

// Asistencia solo aplica a colaboradores de Campo -- a diferencia de un
// pago (donde tipoTrabajo/jornada son opcionales porque tambien puede ser
// un colaborador Fijo), aqui siempre son requeridos.
const asistenciaBase = z.object({
  colaborador: z.string().trim().min(1, "Selecciona un colaborador"),
  fecha: z.string().min(1, "Fecha requerida"),
  tipoTrabajo: z.enum(["proyecto", "oficina"], { message: "Selecciona el tipo de trabajo" }),
  jornada: z.enum(["completo", "medio", "proyecto"], { message: "Selecciona la jornada" }),
  descripcion: z.string().trim().min(1, "Descripción requerida"),
});

export const asistenciaSchema = asistenciaBase.refine(jornadaCoincideConTipoTrabajo, {
  message: "La jornada no coincide con el tipo de trabajo seleccionado",
  path: ["jornada"],
});

export const asistenciaEditSchema = asistenciaBase
  .extend({ id: z.string().uuid() })
  .refine(jornadaCoincideConTipoTrabajo, {
    message: "La jornada no coincide con el tipo de trabajo seleccionado",
    path: ["jornada"],
  });
