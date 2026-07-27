import { z } from "zod";

const colaboradorBase = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido"),
  tipo: z.enum(["fijo", "campo"]),
  // Solo aplica a Fijo -- llega como string crudo del form, se valida con
  // .refine() abajo porque su obligatoriedad depende del tipo elegido.
  salario: z.string().trim().optional().default(""),
});

function salarioValido(data: { tipo: string; salario: string }): boolean {
  if (data.tipo !== "fijo") return true;
  const n = Number(data.salario);
  return data.salario !== "" && !Number.isNaN(n) && n > 0;
}

export const colaboradorSchema = colaboradorBase.refine(salarioValido, {
  message: "El salario quincenal es requerido para colaboradores fijos",
  path: ["salario"],
});

export const colaboradorEditSchema = colaboradorBase
  .extend({ id: z.string().uuid() })
  .refine(salarioValido, {
    message: "El salario quincenal es requerido para colaboradores fijos",
    path: ["salario"],
  });
