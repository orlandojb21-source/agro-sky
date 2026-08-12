import { z } from "zod";

// Datos del Drone: Nombre y Modelo son lo mínimo para identificarlo, así
// que quedan requeridos. Fecha de activación y los 2 números de serie no
// siempre están a mano al momento de registrarlo (mismo criterio que
// Informe Diario) -- quedan opcionales.
//
// Área Cubierta / Horas de Vuelo / Vuelos NO se editan acá -- son de
// solo lectura en Datos del Drone (área separada, ver
// validation/dronesVuelos.ts): solo cambian a través de un nuevo
// Registro de Vuelo, corrección 2026-08-11.
const droneBaseSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido"),
  modelo: z.string().trim().min(1, "Modelo requerido"),
  fechaActivacion: z.string().trim().optional().default(""),
  numeroSerieAeronave: z.string().trim().optional().default(""),
  numeroSeriePlacaFc: z.string().trim().optional().default(""),
  numeroSerieFabrica: z.string().trim().optional().default(""),
});

// Solo al crear se puede dejar cargado un operador inicial -- después, el
// operador se cambia con "Reasignar operador" (queda historizado aparte,
// ver drones_operadores), no editando el drone.
export const droneSchema = droneBaseSchema.extend({
  operadorInicial: z.string().trim().optional().default(""),
});

export const droneEditSchema = droneBaseSchema.extend({ id: z.string().uuid() });

export const reasignarOperadorDroneSchema = z.object({
  droneId: z.string().uuid(),
  operador: z.string().trim().min(1, "Selecciona un operador"),
  fecha: z.string().min(1, "Fecha requerida"),
});
