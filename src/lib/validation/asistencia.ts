import { z } from "zod";
import { jornadaCoincideConTipoTrabajo } from "@/lib/validation/planilla";

// Asistencia solo aplica a colaboradores de Campo -- a diferencia de un
// pago (donde tipoTrabajo/jornada son opcionales porque tambien puede ser
// un colaborador Fijo), aqui siempre son requeridos.
//
// El tipo de proyecto (Ingenio Santa Rosa / Trabajo Particular) NO vive
// aquí para un día de Proyecto con trabajo normal -- vive en cada Informe
// de Campo (ver validation/informesCampo.ts), porque una persona puede
// trabajar en más de un proyecto el mismo día y cada informe tiene su
// propia contabilidad de hectáreas. Sí vive aquí para "sin_trabajo" (día
// de Proyecto sin Informe porque no se pudo trabajar, ver migración
// 0081) -- ahí no hay informe del que sacarlo.
const asistenciaBase = z.object({
  colaborador: z.string().trim().min(1, "Selecciona un colaborador"),
  fecha: z.string().min(1, "Fecha requerida"),
  // Un mismo colaborador de Campo puede ser Operador un día y Ayudante
  // otro -- no es una propiedad fija suya, se marca cada vez. Las tarifas
  // de pago (Oficina y Proyecto) dependen de este rol.
  rolDia: z.enum(["operador", "ayudante"], { message: "Selecciona si es Operador o Ayudante" }),
  tipoTrabajo: z.enum(["proyecto", "oficina", "sin_trabajo"], { message: "Selecciona el tipo de trabajo" }),
  jornada: z.enum(["completo", "medio", "proyecto"], { message: "Selecciona la jornada" }),
  tipoProyecto: z.string().trim().optional().default(""),
  descripcion: z.string().trim().min(1, "Descripción requerida"),
});

function tipoProyectoValido(data: { tipoTrabajo: string; tipoProyecto: string }): boolean {
  if (data.tipoTrabajo !== "sin_trabajo") return true;
  return data.tipoProyecto === "ingenio_santa_rosa" || data.tipoProyecto === "particular";
}

const opcionesTipoProyecto = {
  message: "Selecciona el tipo de proyecto",
  path: ["tipoProyecto"],
};

export const asistenciaSchema = asistenciaBase
  .refine(jornadaCoincideConTipoTrabajo, {
    message: "La jornada no coincide con el tipo de trabajo seleccionado",
    path: ["jornada"],
  })
  .refine(tipoProyectoValido, opcionesTipoProyecto);

export const asistenciaEditSchema = asistenciaBase
  .extend({ id: z.string().uuid() })
  .refine(jornadaCoincideConTipoTrabajo, {
    message: "La jornada no coincide con el tipo de trabajo seleccionado",
    path: ["jornada"],
  })
  .refine(tipoProyectoValido, opcionesTipoProyecto);
