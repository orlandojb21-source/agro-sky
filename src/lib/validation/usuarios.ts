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

export const usuarioUpdateSchema = z.object({
  id: z.string().uuid(),
  nombreCompleto: z.string().trim().min(1, "Nombre requerido"),
  email: z.string().trim().email("Correo inválido"),
  rol: z.enum(ROLES as [string, ...string[]]),
});

export const usuarioPasswordSchema = z.object({
  id: z.string().uuid(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});
