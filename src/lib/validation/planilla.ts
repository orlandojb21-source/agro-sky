import { z } from "zod";

// tipoTrabajo/jornada solo aplican a colaboradores de Campo (pago por dia)
// -- para colaboradores Fijos llegan vacios y se guardan como null. Son
// clasificacion para reportes, no afectan el monto (que se sigue escribiendo
// a mano en ambos casos).
//
// css/seguroEducativo son las 2 deducciones legales de Panama para un
// salario Fijo -- tambien se escriben a mano (no se calculan como
// porcentaje del monto) y llegan vacias para un pago de Campo.
const pagoBase = z.object({
  colaborador: z.string().trim().min(1, "Selecciona un colaborador"),
  fecha: z.string().min(1, "Fecha requerida"),
  descripcion: z.string().trim().min(1, "Descripción requerida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  tipoTrabajo: z.enum(["proyecto", "taller"]).optional().or(z.literal("")),
  jornada: z.enum(["completo", "medio"]).optional().or(z.literal("")),
  css: z.string().trim().optional().default(""),
  seguroEducativo: z.string().trim().optional().default(""),
});

function deduccionValida(valor: string): boolean {
  if (valor === "") return true;
  const n = Number(valor);
  return !Number.isNaN(n) && n >= 0;
}

export const pagoSchema = pagoBase
  .refine((data) => deduccionValida(data.css), {
    message: "El CSS debe ser un número mayor o igual a cero",
    path: ["css"],
  })
  .refine((data) => deduccionValida(data.seguroEducativo), {
    message: "El Seguro Educativo debe ser un número mayor o igual a cero",
    path: ["seguroEducativo"],
  });

export const pagoEditSchema = pagoBase
  .extend({ id: z.string().uuid() })
  .refine((data) => deduccionValida(data.css), {
    message: "El CSS debe ser un número mayor o igual a cero",
    path: ["css"],
  })
  .refine((data) => deduccionValida(data.seguroEducativo), {
    message: "El Seguro Educativo debe ser un número mayor o igual a cero",
    path: ["seguroEducativo"],
  });
