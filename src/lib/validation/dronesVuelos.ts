import { z } from "zod";

// Lo que carga el operador es lo que sumó ESE trabajo (no el total nuevo
// del drone) -- ver registrar_vuelo_drone en la migración 0074, que suma
// estos 3 valores a los totales acumulados del drone.
export const registrarVueloDroneSchema = z.object({
  droneId: z.string().uuid(),
  fecha: z.string().min(1, "Fecha requerida"),
  operador: z.string().trim().min(1, "Selecciona un operador"),
  horasVuelo: z.coerce.number().min(0, "Las horas de vuelo no pueden ser negativas"),
  areaCubierta: z.coerce.number().min(0, "El área cubierta no puede ser negativa"),
  vuelos: z.coerce
    .number()
    .int("Los vuelos deben ser un número entero")
    .min(0, "Los vuelos no pueden ser negativos"),
});
