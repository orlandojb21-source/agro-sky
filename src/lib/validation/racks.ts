import { z } from "zod";

export const rackCreateSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido"),
});

export const contenedorCreateSchema = z.object({
  rackId: z.string().uuid("Rack inválido"),
  nombre: z.string().trim().min(1, "Nombre requerido"),
});
