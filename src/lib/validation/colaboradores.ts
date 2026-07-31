import { z } from "zod";

const colaboradorBase = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido"),
  tipo: z.enum(["fijo", "campo"]),
  // Solo aplica a Fijo -- llega como string crudo del form, se valida con
  // .refine() abajo porque su obligatoriedad depende del tipo elegido.
  salario: z.string().trim().optional().default(""),
  // Checkbox HTML: llega "on" si esta marcado, o ni siquiera aparece en el
  // FormData si no lo esta -- por eso es opcional y se transforma a boolean.
  aplicaDeducciones: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  // Datos personales, todos opcionales (igual que perfiles.telefono) -- no
  // bloquean registrar un colaborador si todavia no se tienen a mano.
  cedula: z.string().trim().optional().default(""),
  correo: z.string().trim().optional().default(""),
  telefono: z.string().trim().optional().default(""),
  direccion: z.string().trim().optional().default(""),
  // Ruta del objeto en el bucket privado "colaboradores-fotos" (no una URL
  // publica) -- se sube antes de enviar el formulario, ver
  // subirFotoColaboradorAction en lib/actions/colaboradorFoto.ts.
  fotoRuta: z.string().trim().optional().default(""),
});

function salarioValido(data: { tipo: string; salario: string }): boolean {
  if (data.tipo !== "fijo") return true;
  const n = Number(data.salario);
  return data.salario !== "" && !Number.isNaN(n) && n > 0;
}

function correoValido(correo: string): boolean {
  if (correo === "") return true;
  return z.string().email().safeParse(correo).success;
}

export const colaboradorSchema = colaboradorBase
  .refine(salarioValido, {
    message: "El salario quincenal es requerido para colaboradores fijos",
    path: ["salario"],
  })
  .refine((data) => correoValido(data.correo), {
    message: "El correo no es válido",
    path: ["correo"],
  });

export const colaboradorEditSchema = colaboradorBase
  .extend({ id: z.string().uuid() })
  .refine(salarioValido, {
    message: "El salario quincenal es requerido para colaboradores fijos",
    path: ["salario"],
  })
  .refine((data) => correoValido(data.correo), {
    message: "El correo no es válido",
    path: ["correo"],
  });
