import { z } from "zod";

const proveedorBase = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido"),
  // Todos opcionales -- no bloquean registrar un proveedor si todavía no
  // se tienen todos los datos a mano (mismo criterio que Colaboradores).
  contacto: z.string().trim().optional().default(""),
  telefono: z.string().trim().optional().default(""),
  correo: z.string().trim().optional().default(""),
  direccion: z.string().trim().optional().default(""),
  ruc: z.string().trim().optional().default(""),
  dv: z.string().trim().optional().default(""),
  nota: z.string().trim().optional().default(""),
});

function correoValido(correo: string): boolean {
  if (correo === "") return true;
  return z.string().email().safeParse(correo).success;
}

export const proveedorSchema = proveedorBase.refine((data) => correoValido(data.correo), {
  message: "El correo no es válido",
  path: ["correo"],
});

export const proveedorEditSchema = proveedorBase
  .extend({ id: z.string().uuid() })
  .refine((data) => correoValido(data.correo), {
    message: "El correo no es válido",
    path: ["correo"],
  });
