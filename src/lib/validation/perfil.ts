import { z } from "zod";

export const perfilUpdateSchema = z.object({
  nombreCompleto: z.string().trim().min(1, "Nombre requerido"),
  telefono: z.string().trim().optional().default(""),
});
