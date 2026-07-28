import { z } from "zod";

// tipoTrabajo/jornada solo aplican a colaboradores de Campo (pago por dia)
// -- para colaboradores Fijos llegan vacios y se guardan como null. Son
// clasificacion para reportes, no afectan el monto (que se sigue escribiendo
// a mano en ambos casos).
//
// css/seguroEducativo son las 2 deducciones legales de Panama para un
// salario Fijo -- tambien se escriben a mano (no se calculan como
// porcentaje del monto) y llegan vacias para un pago de Campo.
//
// bonificacion es un extra que puede recibir un colaborador Fijo junto con
// su salario, pero que NO entra en la base de calculo de CSS/Seguro
// Educativo -- esas 2 deducciones siempre se calculan sobre "monto", nunca
// sobre "bonificacion".
const pagoBase = z.object({
  colaborador: z.string().trim().min(1, "Selecciona un colaborador"),
  fecha: z.string().min(1, "Fecha requerida"),
  descripcion: z.string().trim().min(1, "Descripción requerida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  tipoTrabajo: z.enum(["proyecto", "taller"]).optional().or(z.literal("")),
  jornada: z.enum(["completo", "medio"]).optional().or(z.literal("")),
  css: z.string().trim().optional().default(""),
  seguroEducativo: z.string().trim().optional().default(""),
  bonificacion: z.string().trim().optional().default(""),
});

function montoOpcionalValido(valor: string): boolean {
  if (valor === "") return true;
  const n = Number(valor);
  return !Number.isNaN(n) && n >= 0;
}

export const pagoSchema = pagoBase
  .refine((data) => montoOpcionalValido(data.css), {
    message: "El CSS debe ser un número mayor o igual a cero",
    path: ["css"],
  })
  .refine((data) => montoOpcionalValido(data.seguroEducativo), {
    message: "El Seguro Educativo debe ser un número mayor o igual a cero",
    path: ["seguroEducativo"],
  })
  .refine((data) => montoOpcionalValido(data.bonificacion), {
    message: "La bonificación debe ser un número mayor o igual a cero",
    path: ["bonificacion"],
  });

export const pagoEditSchema = pagoBase
  .extend({ id: z.string().uuid() })
  .refine((data) => montoOpcionalValido(data.css), {
    message: "El CSS debe ser un número mayor o igual a cero",
    path: ["css"],
  })
  .refine((data) => montoOpcionalValido(data.seguroEducativo), {
    message: "El Seguro Educativo debe ser un número mayor o igual a cero",
    path: ["seguroEducativo"],
  })
  .refine((data) => montoOpcionalValido(data.bonificacion), {
    message: "La bonificación debe ser un número mayor o igual a cero",
    path: ["bonificacion"],
  });
