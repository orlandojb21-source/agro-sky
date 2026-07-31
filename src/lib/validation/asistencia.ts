import { z } from "zod";
import { jornadaCoincideConTipoTrabajo } from "@/lib/validation/planilla";

// Asistencia solo aplica a colaboradores de Campo -- a diferencia de un
// pago (donde tipoTrabajo/jornada son opcionales porque tambien puede ser
// un colaborador Fijo), aqui siempre son requeridos.
const asistenciaBase = z.object({
  colaborador: z.string().trim().min(1, "Selecciona un colaborador"),
  fecha: z.string().min(1, "Fecha requerida"),
  // Un mismo colaborador de Campo puede ser Operador un día y Ayudante
  // otro -- no es una propiedad fija suya, se marca cada vez. Las tarifas
  // de pago (Oficina y Proyecto) dependen de este rol.
  rolDia: z.enum(["operador", "ayudante"], { message: "Selecciona si es Operador o Ayudante" }),
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
