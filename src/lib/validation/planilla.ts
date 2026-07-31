import { z } from "zod";

// tipoTrabajo/jornada ya no se capturan en pagos nuevos (eso ahora vive en
// Asistencia) -- se quedan en el schema solo porque un pago historico de
// Campo (dia por dia, de antes de este cambio) todavia los tiene guardados,
// y el formulario de edicion los reenvia tal cual (hidden) para no
// borrarlos al guardar. Para colaboradores Fijos llegan vacios y se
// guardan como null, igual que siempre.
//
// fechaDesde solo aplica a un pago de quincena de Campo (junto con "fecha",
// que en ese caso es el fin del rango) -- para Fijo y para pagos historicos
// de Campo llega vacio y se guarda como null.
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
  fechaDesde: z.string().optional().or(z.literal("")),
  descripcion: z.string().trim().min(1, "Descripción requerida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  tipoTrabajo: z.enum(["proyecto", "oficina"]).optional().or(z.literal("")),
  jornada: z.enum(["completo", "medio", "proyecto"]).optional().or(z.literal("")),
  css: z.string().trim().optional().default(""),
  seguroEducativo: z.string().trim().optional().default(""),
  bonificacion: z.string().trim().optional().default(""),
});

function montoOpcionalValido(valor: string): boolean {
  if (valor === "") return true;
  const n = Number(valor);
  return !Number.isNaN(n) && n >= 0;
}

// La jornada queda ligada al tipo de trabajo (pedido del usuario): Proyecto
// siempre usa jornada "proyecto" (no se elige día completo/medio día);
// Oficina siempre usa "completo" o "medio". Se valida también aquí (no solo
// ocultando opciones en el formulario) para que un envío manipulado no
// pueda guardar una combinación inconsistente.
export function jornadaCoincideConTipoTrabajo(data: { tipoTrabajo?: string; jornada?: string }): boolean {
  if (data.tipoTrabajo === "proyecto") return data.jornada === "proyecto";
  if (data.tipoTrabajo === "oficina") return data.jornada === "completo" || data.jornada === "medio";
  return true;
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
  })
  .refine(jornadaCoincideConTipoTrabajo, {
    message: "La jornada no coincide con el tipo de trabajo seleccionado",
    path: ["jornada"],
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
  })
  .refine(jornadaCoincideConTipoTrabajo, {
    message: "La jornada no coincide con el tipo de trabajo seleccionado",
    path: ["jornada"],
  });
