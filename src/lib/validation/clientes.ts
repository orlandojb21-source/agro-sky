import { z } from "zod";

function correoValido(correo: string): boolean {
  if (correo === "") return true;
  return z.string().email().safeParse(correo).success;
}

// Datos personales/fiscales, todos opcionales salvo el nombre -- no todos
// los clientes tienen RUC (persona natural) ni se conocen todos los datos
// desde el primer día (mismo criterio que colaboradores.ts).
const clienteBase = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido"),
  cedula: z.string().trim().optional().default(""),
  ruc: z.string().trim().optional().default(""),
  rucDv: z.string().trim().optional().default(""),
  telefono: z.string().trim().optional().default(""),
  direccion: z.string().trim().optional().default(""),
  correo: z.string().trim().optional().default(""),
});

export const clienteSchema = clienteBase.refine((data) => correoValido(data.correo), {
  message: "El correo no es válido",
  path: ["correo"],
});

export const clienteEditSchema = clienteBase
  .extend({ id: z.string().uuid() })
  .refine((data) => correoValido(data.correo), {
    message: "El correo no es válido",
    path: ["correo"],
  });
