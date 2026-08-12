import { z } from "zod";

// Lo que carga el operador es la LECTURA NUEVA (el total acumulado del
// drone a esa fecha, como un odómetro) -- no lo que sumó ese trabajo. El
// RPC registrar_vuelo_drone (migración 0075) calcula la diferencia
// contra la lectura anterior y deja el drone con estos totales nuevos.
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
