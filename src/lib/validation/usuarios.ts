import { z } from "zod";
import { ROLES } from "@/lib/roles";

export const usuarioCreateSchema = z.object({
  nombreCompleto: z.string().trim().min(1, "Nombre requerido"),
  email: z.string().trim().email("Correo inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol: z.enum(ROLES as [string, ...string[]]),
});

export const usuarioRolSchema = z.object({
  id: z.string().uuid(),
  rol: z.enum(ROLES as [string, ...string[]]),
});
