import { z } from "zod";

export const colaboradorSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido"),
  tipo: z.enum(["fijo", "campo"]),
});
