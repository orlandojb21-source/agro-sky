import { z } from "zod";

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
  // Texto libre (no solo números) -- en el campo a veces anotan la dosis
  // con letras además del número, ej. "2.8qxHA" (pedido del usuario,
  // 2026-08-05).
  dosisPorHectarea: z.string().trim().min(1, "La dosis por hectárea es requerida"),
  // Determina la tarifa del cálculo de incentivos por hectárea de este
  // informe (ver lib/calculoIncentivos.ts) -- vive aquí y no en Asistencia
  // porque cada informe tiene su propia contabilidad de hectáreas, nunca
  // se suman entre informes distintos del mismo día.
  tipoProyecto: z.enum(["ingenio_santa_rosa", "particular"], { message: "Selecciona el tipo de proyecto" }),
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
