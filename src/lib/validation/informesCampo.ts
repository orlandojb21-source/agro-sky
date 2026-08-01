import { z } from "zod";

function numeroRequeridoPositivo(mensaje: string) {
  return z
    .string()
    .trim()
    .min(1, mensaje)
    .transform((v) => Number(v))
    .refine((v) => !Number.isNaN(v) && v > 0, mensaje);
}

export const parcelaInformeCampoSchema = z.object({
  numeroParcela: z.string().trim().min(1, "Falta el número de parcela"),
  hectareas: z.number().positive("Las hectáreas deben ser mayores a cero"),
});

export const productoInformeCampoSchema = z.object({
  productoActivo: z.string().trim().min(1, "Falta el producto activo"),
  ltsPorHectarea: z.number().positive("Los litros por hectárea deben ser mayores a cero"),
});

// Encabezado requerido en su totalidad (es un documento formal que se
// envía al cliente) + Parcelas con mínimo 1 fila + ambas firmas (dibujadas
// en FirmaCanvas, subidas antes de enviar el formulario -- ver
// InformeCampoForm.tsx). Productos es opcional -- no siempre se usa
// (pedido explícito del usuario), puede quedar en un array vacío.
const informeCampoBaseSchema = z.object({
  cliente: z.string().trim().min(1, "Nombre del cliente requerido"),
  fecha: z.string().min(1, "Fecha requerida"),
  finca: z.string().trim().min(1, "Finca requerida"),
  horaInicio: z.string().min(1, "Hora de inicio requerida"),
  horaFin: z.string().min(1, "Hora de finalización requerida"),
  meteorologia: z.string().trim().min(1, "Meteorología requerida"),
  modeloDrone: z.string().trim().min(1, "Modelo de drone requerido"),
  dosisPorHectarea: numeroRequeridoPositivo("La dosis por hectárea debe ser mayor a cero"),
  operador: z.string().trim().min(1, "Selecciona un operador"),
  ayudantes: z.array(z.string().trim().min(1)).default([]),
  firmaAgroRuta: z.string().trim().min(1, "Falta la firma de Agro Sky"),
  nombreFirmaAgro: z.string().trim().min(1, "Falta el nombre de quien firma por Agro Sky"),
  firmaClienteRuta: z.string().trim().min(1, "Falta la firma del cliente"),
  nombreFirmaCliente: z.string().trim().min(1, "Falta el nombre de quien firma por el cliente"),
  parcelas: z.array(parcelaInformeCampoSchema).min(1, "Agrega al menos una parcela"),
  productos: z.array(productoInformeCampoSchema).default([]),
});

const horaFinValida = (data: { horaInicio: string; horaFin: string }) => data.horaFin >= data.horaInicio;
const horaFinOpciones = {
  message: "La hora de finalización debe ser igual o posterior a la de inicio",
  path: ["horaFin"],
};

export const informeCampoSchema = informeCampoBaseSchema.refine(horaFinValida, horaFinOpciones);

export const informeCampoEditSchema = informeCampoBaseSchema
  .extend({ id: z.string().uuid() })
  .refine(horaFinValida, horaFinOpciones);
